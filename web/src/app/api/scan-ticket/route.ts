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
  confidence?: unknown;
  subtotal?: unknown;
  discountTotal?: unknown;
  tax?: unknown;
  items?: unknown;
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

function normalizeItemName(value: string): string {
  return value
    .replace(/[|¦]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractNameFromSourceLine(sourceLine: string): string {
  if (!sourceLine) return "";

  return sourceLine
    .replace(/\b\d{4,}\b/g, " ")
    .replace(/[-+]?\d+[.,]\d{1,2}\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isSummaryLikeItem(name: string, sourceLine: string, lineAmount: number, totalAmount: number | null): boolean {
  const text = `${name} ${sourceLine}`.toLowerCase();
  const softSummaryTokens = [
    "suma",
    "subtotal",
    "total",
    "tax",
    "iva",
    "impuesto",
    "descuento",
    "discount",
    "סכום",
    "סהכ",
  ];

  const hardSummaryTokens = ["לתשלום", "מעמ", "תשלום"];

  if (hardSummaryTokens.some((token) => text.includes(token))) {
    return true;
  }

  if (!softSummaryTokens.some((token) => text.includes(token))) {
    return false;
  }

  if (totalAmount === null) return false;
  return Math.abs(lineAmount - totalAmount) <= 0.05;
}

type NormalizedItem = {
  name: string;
  qty: number;
  lineTotal: number;
  unitPrice: number | null;
  discount: number;
};

function normalizeScannedItems(rawPayload: ParsedScanPayload): NormalizedItem[] {
  const rawItems = Array.isArray(rawPayload.items)
    ? (rawPayload.items as ParsedLineItem[])
    : [];
  const totalAmount = toFiniteNumber(rawPayload.amount);

  return rawItems
    .map((item) => {
      const inputName = normalizeItemName(toSafeText(item.name));
      const sourceLine = toSafeText(item.sourceLine);
      const fallbackName = normalizeItemName(extractNameFromSourceLine(sourceLine));
      const name = inputName || fallbackName;
      const qty = toFiniteNumber(item.qty);
      const unitPrice = toFiniteNumber(item.unitPrice);
      const totalPrice = toFiniteNumber(item.totalPrice);
      const discount = toFiniteNumber(item.discount);

      const lineTotal = totalPrice ?? unitPrice;
      if (!name || lineTotal === null) return null;
      if (isSummaryLikeItem(name, sourceLine, lineTotal, totalAmount)) return null;

      return {
        name,
        qty: qty !== null && qty > 0 ? qty : 1,
        lineTotal,
        unitPrice,
        discount: discount ?? 0,
      };
    })
    .filter((entry): entry is NormalizedItem => Boolean(entry));
}

function buildItemizedDetails(rawPayload: ParsedScanPayload, currency: string): string {
  void currency;

  const rawSummary = toSafeText(rawPayload.purchaseSummaryRaw);
  if (rawSummary) {
    return rawSummary;
  }

  const purchaseSectionLines = toSafeLines(rawPayload.purchaseSectionLines);
  if (purchaseSectionLines.length > 0) {
    return uniqueInOrder(purchaseSectionLines).join("\n");
  }

  const ocrLines = toSafeLines(rawPayload.ocrLines);
  if (ocrLines.length > 0) {
    const extractedSection = extractPurchaseSectionFromOcrLines(ocrLines);
    if (extractedSection.length > 0) {
      return extractedSection.join("\n");
    }
  }

  const rawItems = Array.isArray(rawPayload.items)
    ? (rawPayload.items as ParsedLineItem[])
    : [];

  const sourceLines = rawItems
    .map((item) => toSafeText(item.sourceLine))
    .filter(Boolean);

  if (sourceLines.length > 0) {
    return uniqueInOrder(sourceLines).join("\n");
  }

  return toSafeText(rawPayload.details);
}

function buildVirtualTicket(rawPayload: ParsedScanPayload, currency: string) {
  const items = normalizeScannedItems(rawPayload).map((item) => ({
    name: item.name,
    qty: item.qty,
    lineTotal: item.lineTotal,
    unitPrice: item.unitPrice,
    discount: item.discount,
  }));

  return {
    currency,
    total: toFiniteNumber(rawPayload.amount) ?? 0,
    items,
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

    const resolvedDetails = buildItemizedDetails(parsed, resolvedCurrency);

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
