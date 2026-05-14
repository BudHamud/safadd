import { NextRequest, NextResponse } from "next/server";
import {
  ensureAppUserProfile,
  requireAuth,
} from "../../../lib/supabase-server";
import { prisma } from "../../../lib/prisma";
import {
  consumeRateLimit,
  enforceSameOrigin,
  fetchAllowed,
  getRequiredServerEnv,
  isValidImageMimeType,
} from "../../../lib/security";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

type ParsedLineItem = {
  name?: unknown;
  qty?: unknown;
  unitPrice?: unknown;
  totalPrice?: unknown;
  lineTotal?: unknown;
  discount?: unknown;
  sourceLine?: unknown;
};

type ParsedScanPayload = {
  error?: unknown;
  amount?: unknown;
  currency?: unknown;
  desc?: unknown;
  tag?: unknown;
  date?: unknown;
  details?: unknown;
  purchaseSummaryRaw?: unknown;
  purchaseSectionLines?: unknown;
  ocrLines?: unknown;
  simpleItems?: unknown;
  confidence?: unknown;
  subtotal?: unknown;
  discountTotal?: unknown;
  tax?: unknown;
  items?: unknown;
};

type SimpleTicketItem = {
  title: string;
  qty: number;
  lineTotal: number;
  sourceLine: string;
};

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.replace(/[^\d,.-]/g, "").replace(/,/g, ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toSafeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toSafeLines(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((line) => toSafeText(line))
    .filter(Boolean);
}

function uniqueInOrder(lines: string[]): string[] {
  const unique: string[] = [];
  for (const line of lines) {
    if (!unique.includes(line)) unique.push(line);
  }
  return unique;
}

function isPurchaseHeaderLine(line: string): boolean {
  const text = line.toLowerCase();
  const tokens = ["פריט", "שם פריט", "קוד", "קוד פריט", "ברקוד", "סכום", "מחיר", "תיאור", "תאור"];
  let hits = 0;
  for (const token of tokens) {
    if (text.includes(token)) hits += 1;
  }
  return hits >= 2;
}

function isSummaryFooterLine(line: string): boolean {
  const text = line.toLowerCase();
  const tokens = [
    "לתשלום",
    "סהכ",
    "סכום",
    "מעמ",
    "אשראי",
    "מזומן",
    "עודף",
    "שולם",
    "חיוב",
    "ישראכרט",
    "visa",
    "mastercard",
  ];

  return tokens.some((token) => text.includes(token));
}

function looksLikeItemLine(line: string): boolean {
  const hasAmount = /[-+]?\d+[.,]\d{1,2}/.test(line);
  const hasText = /[\u0590-\u05FFA-Za-z]/.test(line);
  return hasAmount && hasText;
}

function extractPurchaseSectionFromOcrLines(rawLines: string[]): string[] {
  const lines = uniqueInOrder(rawLines).filter((line) => line.length > 0);
  if (lines.length === 0) return [];

  let start = lines.findIndex((line) => isPurchaseHeaderLine(line));
  if (start >= 0) {
    start += 1;
  } else {
    start = lines.findIndex((line) => looksLikeItemLine(line));
  }

  if (start < 0) return [];

  let end = lines.length;
  for (let i = start; i < lines.length; i += 1) {
    if (isSummaryFooterLine(lines[i])) {
      end = i;
      break;
    }
  }

  const section = lines.slice(start, end).filter((line) => line.length > 0);
  if (section.length === 0) return [];

  const hasItemLikeLine = section.some((line) => looksLikeItemLine(line));
  if (!hasItemLikeLine) return [];

  return section;
}

function formatAmount(value: number, currency: string): string {
  const symbols: Record<string, string> = {
    USD: "$",
    ARS: "AR$",
    ILS: "₪",
    EUR: "€",
  };
  const symbol = symbols[currency] ?? `${currency} `;
  return `${symbol}${value.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatCompactAmount(value: number, currency: string): string {
  const symbols: Record<string, string> = {
    USD: "$",
    ARS: "AR$",
    ILS: "₪",
    EUR: "€",
  };
  const symbol = symbols[currency] ?? `${currency} `;
  return `${symbol}${value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function extractDecimalValues(text: string): number[] {
  const matches = text.match(/[-+]?\d+[.,]\d{1,2}/g) ?? [];
  return matches
    .map((token) => toFiniteNumber(token))
    .filter((value): value is number => value !== null);
}

function parseQty(value: unknown, sourceLine: string): number {
  const fromValue = toFiniteNumber(value);
  if (fromValue !== null && fromValue > 0) return fromValue;

  const qtyMatch = sourceLine.match(/(?:x|X)\s*(\d+(?:[.,]\d+)?)/) ?? sourceLine.match(/(\d+(?:[.,]\d+)?)\s*(?:x|X)/);
  if (!qtyMatch) return 1;

  const parsed = toFiniteNumber(qtyMatch[1]);
  return parsed !== null && parsed > 0 ? parsed : 1;
}

function cleanTitle(text: string): string {
  return text
    .replace(/\b\d{6,}\b/g, " ")
    .replace(/[-+]?\d+[.,]\d{1,2}/g, " ")
    .replace(/\b(?:x|X)\s*\d+(?:[.,]\d+)?\b/g, " ")
    .replace(/[₪$€]/g, " ")
    .replace(/[|¦:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isSimpleSummaryLine(line: string): boolean {
  return isSummaryFooterLine(line) || isPurchaseHeaderLine(line);
}

function buildSimpleItemFromLine(line: string): SimpleTicketItem | null {
  if (!line || isSimpleSummaryLine(line)) return null;

  const amounts = extractDecimalValues(line);
  if (amounts.length === 0) return null;

  // Keep the final amount shown in the line (avoids picking per-kg price).
  const lineTotal = amounts[amounts.length - 1];
  if (!Number.isFinite(lineTotal)) return null;

  const title = cleanTitle(line);
  if (!title) return null;

  return {
    title,
    qty: parseQty(null, line),
    lineTotal,
    sourceLine: line,
  };
}

function dedupeSimpleItems(items: SimpleTicketItem[]): SimpleTicketItem[] {
  const unique: SimpleTicketItem[] = [];

  for (const item of items) {
    const normalizedTitle = item.title.toLowerCase();
    const exists = unique.some((candidate) => {
      const candidateTitle = candidate.title.toLowerCase();
      const titleMatches = candidateTitle === normalizedTitle || candidateTitle.includes(normalizedTitle) || normalizedTitle.includes(candidateTitle);
      const amountMatches = Math.abs(candidate.lineTotal - item.lineTotal) <= 0.03;
      return titleMatches && amountMatches;
    });
    if (!exists) unique.push(item);
  }

  return unique;
}

function buildSimpleItemsFromPayloadItems(rawPayload: ParsedScanPayload): SimpleTicketItem[] {
  const rawItems = Array.isArray(rawPayload.items)
    ? (rawPayload.items as ParsedLineItem[])
    : [];

  return rawItems
    .map((item) => {
      const sourceLine = toSafeText(item.sourceLine);
      const sourceAmounts = extractDecimalValues(sourceLine);
      const candidateLineTotal =
        toFiniteNumber(item.totalPrice)
        ?? toFiniteNumber(item.lineTotal)
        ?? (sourceAmounts.length > 0 ? sourceAmounts[sourceAmounts.length - 1] : null)
        ?? toFiniteNumber(item.unitPrice);

      if (candidateLineTotal === null) return null;

      const name = cleanTitle(toSafeText(item.name)) || cleanTitle(sourceLine);
      if (!name) return null;

      return {
        title: name,
        qty: parseQty(item.qty, sourceLine),
        lineTotal: candidateLineTotal,
        sourceLine,
      };
    })
    .filter((entry): entry is SimpleTicketItem => Boolean(entry));
}

function buildSimpleItemsFromLines(rawPayload: ParsedScanPayload): SimpleTicketItem[] {
  const fromPurchaseSection = toSafeLines(rawPayload.purchaseSectionLines);
  const fromOcrLines = extractPurchaseSectionFromOcrLines(toSafeLines(rawPayload.ocrLines));
  const fromRawSummary = toSafeText(rawPayload.purchaseSummaryRaw)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const fallbackOcrLines = toSafeLines(rawPayload.ocrLines).filter((line) => looksLikeItemLine(line) && !isSimpleSummaryLine(line));

  return uniqueInOrder([...fromPurchaseSection, ...fromOcrLines, ...fromRawSummary, ...fallbackOcrLines])
    .map((line) => buildSimpleItemFromLine(line))
    .filter((entry): entry is SimpleTicketItem => Boolean(entry));
}

function evaluateMath(items: SimpleTicketItem[], totalAmount: number | null) {
  const sum = items.reduce((acc, item) => acc + item.lineTotal, 0);
  if (totalAmount === null) {
    return { sum, diff: 0, ok: items.length > 0 };
  }

  const diff = Math.abs(sum - totalAmount);
  const tolerance = Math.max(0.75, totalAmount * 0.04);
  return { sum, diff, ok: diff <= tolerance && items.length > 0 };
}

function selectSimpleItems(rawPayload: ParsedScanPayload) {
  const totalAmount = toFiniteNumber(rawPayload.amount);
  const fromPayloadItems = dedupeSimpleItems(buildSimpleItemsFromPayloadItems(rawPayload));
  const fromLines = dedupeSimpleItems(buildSimpleItemsFromLines(rawPayload));
  const merged = dedupeSimpleItems([...fromLines, ...fromPayloadItems]);

  const payloadEval = evaluateMath(fromPayloadItems, totalAmount);
  const lineEval = evaluateMath(fromLines, totalAmount);
  const mergedEval = evaluateMath(merged, totalAmount);

  if (merged.length > 0) {
    if (mergedEval.ok) {
      return { items: merged, ...mergedEval, reanalyzed: true };
    }

    if (fromLines.length > fromPayloadItems.length) {
      return { items: merged, ...mergedEval, reanalyzed: true };
    }

    if (payloadEval.ok) {
      return { items: fromPayloadItems, ...payloadEval, reanalyzed: false };
    }

    if (lineEval.ok) {
      return { items: fromLines, ...lineEval, reanalyzed: true };
    }

    return { items: merged, ...mergedEval, reanalyzed: true };
  }

  if (payloadEval.ok) {
    return { items: fromPayloadItems, ...payloadEval, reanalyzed: false };
  }

  if (lineEval.ok) {
    return { items: fromLines, ...lineEval, reanalyzed: true };
  }

  if (fromLines.length >= fromPayloadItems.length) {
    return { items: fromLines, ...lineEval, reanalyzed: true };
  }

  return { items: fromPayloadItems, ...payloadEval, reanalyzed: false };
}

function buildItemizedDetails(rawPayload: ParsedScanPayload, currency: string): string {
  const selected = selectSimpleItems(rawPayload);

  if (selected.items.length > 0) {
    return selected.items
      .map((item) => `- x${item.qty} ${item.title} ${formatCompactAmount(item.lineTotal, currency)}`)
      .join("\n");
  }

  const rawSummary = toSafeText(rawPayload.purchaseSummaryRaw);
  if (rawSummary) return rawSummary;

  return toSafeText(rawPayload.details);
}

function buildVirtualTicket(rawPayload: ParsedScanPayload, currency: string) {
  const selected = selectSimpleItems(rawPayload);

  return {
    currency,
    total: toFiniteNumber(rawPayload.amount) ?? 0,
    items: selected.items.map((item) => ({
      name: item.title,
      qty: item.qty,
      lineTotal: item.lineTotal,
      sourceLine: item.sourceLine,
    })),
    mathCheckPassed: selected.ok,
    mathDiff: selected.diff,
    reanalyzed: selected.reanalyzed,
  };
}

// ── Rate limit config ──
const DAILY_SCAN_LIMIT = 15; // Max scans per day for regular users

const SYSTEM_PROMPT = `Eres un asistente experto en contabilidad y análisis de comprobantes fiscales.
Analiza la imagen de un ticket, factura, recibo o comprobante de pago y extrae los datos relevantes.

RESPONDE ÚNICAMENTE con un JSON válido (sin markdown, sin explicaciones, sin bloques de código), con esta estructura exacta:
{
  "amount": number,
  "currency": "USD"|"ARS"|"ILS"|"EUR",
  "desc": string,
  "tag": string,
  "date": string,
  "purchaseSummaryRaw": string,
  "purchaseSectionLines": [string],
  "ocrLines": [string],
  "simpleItems": [
    {
      "title": string,
      "qty": number,
      "lineTotal": number,
      "sourceLine": string
    }
  ],
  "details": string,
  "confidence": number,
  "subtotal": number,
  "discountTotal": number,
  "tax": number,
  "items": [
    {
      "name": string,
      "qty": number,
      "unitPrice": number,
      "totalPrice": number,
      "discount": number,
      "sourceLine": string
    }
  ]
}

Reglas:
- "amount": Monto TOTAL (número, sin símbolo de moneda, ej: 1523.50)
- "currency": Moneda detectada. Si hay ₪ usa ILS, si hay $ infiere (AR$ = ARS, US$ = USD), si hay € usa EUR
- "desc": Nombre del comercio/servicio conciso (ej: "McDonald's", "YPF", "Amazon")
- "tag": Categoría sugerida, DEBE ser una de: alimentacion, transporte, salud, entretenimiento, viajes, suscripcion, servicios, educacion, ropa, hogar, tecnologia, otro
- "date": Fecha en formato YYYY-MM-DD. Si no hay fecha visible, usa "${new Date().toISOString().split("T")[0]}"
- "purchaseSummaryRaw": transcripción LITERAL del bloque de compra (ítems/descuentos) tal cual aparece en el ticket, mismo idioma, mismo orden de líneas, sin traducir, sin resumir y sin corregir OCR.
- "purchaseSectionLines": mismo contenido que purchaseSummaryRaw, pero como array (1 elemento por línea visual del ticket).
- "ocrLines": OCR completo de todo el ticket en orden visual estricto (1 elemento por línea visual).
- "simpleItems": lista SIMPLE para UI: solo título, unidades y precio final pagado por línea.
- "details": copia exacta de "purchaseSummaryRaw".
- "confidence": 0 a 100, qué tan seguro estás de la lectura
- "subtotal": subtotal antes de descuentos e impuestos cuando exista
- "discountTotal": descuento total aplicado en el ticket (0 si no hay)
- "tax": impuestos totales cuando estén explícitos
- "items": lista de líneas detectadas del ticket con nombre, cantidad, precio unitario, total por línea y descuento por ítem (si existe)
- Cada item DEBE salir de la misma línea del ticket donde aparece su precio. No mezcles descripción desde línea superior o inferior.
- Deben salir TODAS las líneas de producto detectadas en el ticket, no omitas ninguna por baja confianza.
- Ignora líneas de resumen como subtotal/total/impuestos/descuentos/sumas (ej: "סהכ", "לתשלום", "מעמ").
- Si una línea es ambigua, conserva igual el item con el mejor nombre posible en lugar de descartarlo.
- Si no ves cantidad explícita, usa qty=1.
- Para cada item agrega "sourceLine" con el texto OCR exacto de la línea original de ese item.
- En "simpleItems", lineTotal DEBE ser el importe final cobrado de esa línea, no el precio por kilo/unidad.
- Ejemplo: si la línea dice "frutilla 22.5 x k 20.86", extrae title="frutilla" y lineTotal=20.86.
- En "simpleItems", qty debe ser unidades compradas (si no se ve, usar 1).
- No normalices texto, no cambies signos, no transliteres, no traduzcas hebreo/español/inglés.
- Prioriza fidelidad textual por encima de interpretación semántica.
- Si dudas entre dos lecturas, conserva la lectura más literal que aparece en la imagen.
- Si el ticket muestra múltiples subtotales, toma el TOTAL GENERAL
- Si hay propinas opcionales, NO las incluyas salvo que el monto final ya las incluya
- Si el documento no parece un comprobante de pago, devuelve { "error": "No es un comprobante" }`;

export async function POST(req: NextRequest) {
  try {
    const groqApiKey = getRequiredServerEnv("GROQ_API_KEY");

    const originError = enforceSameOrigin(req);
    if (originError) return originError;

    const rateLimitError = consumeRateLimit(req, {
      key: "scan-ticket",
      limit: 30,
      windowMs: 15 * 60 * 1000,
    });
    if (rateLimitError) return rateLimitError;

    const auth = await requireAuth(req);
    if (auth.error || !auth.user) {
      return NextResponse.json(
        { error: "unauthorized" },
        { status: auth.status },
      );
    }

    const body = await req.json();
    const { imageBase64, mimeType } = body;

    if (!imageBase64 || !mimeType) {
      return NextResponse.json({ error: "Imagen requerida" }, { status: 400 });
    }

    if (typeof imageBase64 !== "string" || imageBase64.length > 15_000_000) {
      return NextResponse.json(
        { error: "Imagen inválida o demasiado grande" },
        { status: 400 },
      );
    }

    if (!isValidImageMimeType(mimeType)) {
      return NextResponse.json(
        { error: "Tipo de imagen no permitido" },
        { status: 400 },
      );
    }

    const currentUser = await ensureAppUserProfile(auth.user);

    // ── Check user role & rate limit ──
    const isAdmin = currentUser.role === "admin";
    const todayStr = new Date().toISOString().split("T")[0];

    if (!isAdmin) {
      const usage = await prisma.scanUsage.findUnique({
        where: { userId_date: { userId: currentUser.id, date: todayStr } },
        select: { count: true },
      });

      const currentCount = usage?.count ?? 0;

      if (currentCount >= DAILY_SCAN_LIMIT) {
        return NextResponse.json(
          {
            error: `Límite diario alcanzado (${DAILY_SCAN_LIMIT} escaneos). Vuelve mañana.`,
            limit: DAILY_SCAN_LIMIT,
            used: currentCount,
            isLimited: true,
          },
          { status: 429 },
        );
      }
    }

    // ── Call Groq API ──
    const dataUri = `data:${mimeType};base64,${imageBase64}`;

    const groqPayload = {
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: SYSTEM_PROMPT },
            {
              type: "image_url",
              image_url: { url: dataUri },
            },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 1200,
      response_format: { type: "json_object" },
    };

    const groqRes = await fetchAllowed(
      GROQ_URL,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqApiKey}`,
        },
        body: JSON.stringify(groqPayload),
      },
      {
        timeoutMs: 12000,
      },
    );

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error("Groq API error:", groqRes.status, errText);
      return NextResponse.json(
        {
          error: `Error de Groq (${groqRes.status}): ${errText.slice(0, 200)}`,
        },
        { status: 502 },
      );
    }

    const groqData = await groqRes.json();
    const rawText = groqData?.choices?.[0]?.message?.content;

    if (!rawText) {
      return NextResponse.json(
        { error: "Respuesta vacía de Groq" },
        { status: 502 },
      );
    }

    // Parse JSON response
    let parsed: ParsedScanPayload;
    try {
      const clean = rawText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      parsed = JSON.parse(clean);
    } catch {
      console.error("Failed to parse Groq response:", rawText);
      return NextResponse.json(
        { error: "No se pudo parsear la respuesta", raw: rawText },
        { status: 502 },
      );
    }

    if (parsed.error) {
      return NextResponse.json({ error: parsed.error }, { status: 422 });
    }

    // ── Increment daily scan count (only for non-admin) ──
    if (!isAdmin) {
      await prisma.scanUsage.upsert({
        where: { userId_date: { userId: currentUser.id, date: todayStr } },
        update: { count: { increment: 1 } },
        create: {
          userId: currentUser.id,
          authId: auth.user.id, // <--- NUEVO: Guardamos el ID de Supabase
          date: todayStr,
          count: 1,
        },
      });
    }

    // ── Get remaining scans info ──
    let remaining: number | null = null;
    if (!isAdmin) {
      const usage = await prisma.scanUsage.findUnique({
        where: { userId_date: { userId: currentUser.id, date: todayStr } },
        select: { count: true },
      });
      remaining = DAILY_SCAN_LIMIT - (usage?.count ?? 0);
    }

    const resolvedCurrency =
      typeof parsed.currency === "string" && ["USD", "ARS", "ILS", "EUR"].includes(parsed.currency)
        ? parsed.currency
        : "USD";

    const selectedSimple = selectSimpleItems(parsed);
    const resolvedDetails = selectedSimple.items.length > 0
      ? selectedSimple.items
        .map((item) => `- x${item.qty} ${item.title} ${formatCompactAmount(item.lineTotal, resolvedCurrency)}`)
        .join("\n")
      : buildItemizedDetails(parsed, resolvedCurrency);

    return NextResponse.json({
      amount: toFiniteNumber(parsed.amount) ?? 0,
      currency: resolvedCurrency,
      desc: toSafeText(parsed.desc),
      tag: toSafeText(parsed.tag) || "otro",
      date: toSafeText(parsed.date) || new Date().toISOString().split("T")[0],
      details: resolvedDetails,
      purchaseSummaryRaw: toSafeText(parsed.purchaseSummaryRaw) || resolvedDetails,
      purchaseSectionLines: toSafeLines(parsed.purchaseSectionLines),
      ocrLines: toSafeLines(parsed.ocrLines),
      simpleItems: selectedSimple.items,
      mathCheckPassed: selectedSimple.ok,
      mathDiff: selectedSimple.diff,
      reanalyzed: selectedSimple.reanalyzed,
      confidence: toFiniteNumber(parsed.confidence) ?? 70,
      items: Array.isArray(parsed.items) ? parsed.items : [],
      subtotal: toFiniteNumber(parsed.subtotal),
      discountTotal: toFiniteNumber(parsed.discountTotal) ?? 0,
      tax: toFiniteNumber(parsed.tax),
      virtualTicket: buildVirtualTicket(parsed, resolvedCurrency),
      remaining, // null for admins (unlimited), number for regular users
    });
  } catch (err: any) {
    console.error("scan-ticket error:", err);
    return NextResponse.json(
      { error: err.message ?? "Error interno" },
      { status: 500 },
    );
  }
}
