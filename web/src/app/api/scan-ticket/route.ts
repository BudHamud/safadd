import { NextRequest, NextResponse } from 'next/server';
import { ensureAppUserProfile, requireAuth, supabaseAdmin } from '../../../lib/supabase-server';
import { consumeRateLimit, enforceSameOrigin, fetchAllowed, getRequiredServerEnv, isValidImageMimeType } from '../../../lib/security';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

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
  "details": string,
  "confidence": number
}

Reglas:
- "amount": Monto TOTAL (número, sin símbolo de moneda, ej: 1523.50)
- "currency": Moneda detectada. Si hay ₪ usa ILS, si hay $ infiere (AR$ = ARS, US$ = USD), si hay € usa EUR
- "desc": Nombre del comercio/servicio conciso (ej: "McDonald's", "YPF", "Amazon")
- "tag": Categoría sugerida, DEBE ser una de: alimentacion, transporte, salud, entretenimiento, viajes, suscripcion, servicios, educacion, ropa, hogar, tecnologia, otro
- "date": Fecha en formato YYYY-MM-DD. Si no hay fecha visible, usa "${new Date().toISOString().split('T')[0]}"
- "details": Resumen breve de los ítems o descripción del servicio (máximo 100 caracteres)
- "confidence": 0 a 100, qué tan seguro estás de la lectura
- Si el ticket muestra múltiples subtotales, toma el TOTAL GENERAL
- Si hay propinas opcionales, NO las incluyas salvo que el monto final ya las incluya
- Si el documento no parece un comprobante de pago, devuelve { "error": "No es un comprobante" }`;

export async function POST(req: NextRequest) {
    try {
        const groqApiKey = getRequiredServerEnv('GROQ_API_KEY');

        const originError = enforceSameOrigin(req);
        if (originError) return originError;

        const rateLimitError = consumeRateLimit(req, {
            key: 'scan-ticket',
            limit: 30,
            windowMs: 15 * 60 * 1000,
        });
        if (rateLimitError) return rateLimitError;

        const auth = await requireAuth(req);
        if (auth.error || !auth.user) {
            return NextResponse.json({ error: 'unauthorized' }, { status: auth.status });
        }

        const body = await req.json();
        const { imageBase64, mimeType } = body;

        if (!imageBase64 || !mimeType) {
            return NextResponse.json({ error: 'Imagen requerida' }, { status: 400 });
        }

        if (typeof imageBase64 !== 'string' || imageBase64.length > 15_000_000) {
            return NextResponse.json({ error: 'Imagen inválida o demasiado grande' }, { status: 400 });
        }

        if (!isValidImageMimeType(mimeType)) {
            return NextResponse.json({ error: 'Tipo de imagen no permitido' }, { status: 400 });
        }

        const currentUser = await ensureAppUserProfile(auth.user);

        // ── Check user role & rate limit ──
        const isAdmin = currentUser.role === 'admin';
        const todayStr = new Date().toISOString().split('T')[0];

        if (!isAdmin) {
            // Check daily usage
            const { data: usage } = await supabaseAdmin
                .from('ScanUsage').select('count')
                .eq('userId', currentUser.id).eq('date', todayStr).maybeSingle();

            const currentCount = usage?.count ?? 0;

            if (currentCount >= DAILY_SCAN_LIMIT) {
                return NextResponse.json({
                    error: `Límite diario alcanzado (${DAILY_SCAN_LIMIT} escaneos). Vuelve mañana.`,
                    limit: DAILY_SCAN_LIMIT,
                    used: currentCount,
                    isLimited: true
                }, { status: 429 });
            }
        }

        // ── Call Groq API ──
        const dataUri = `data:${mimeType};base64,${imageBase64}`;

        const groqPayload = {
            model: 'meta-llama/llama-4-scout-17b-16e-instruct',
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: SYSTEM_PROMPT },
                        {
                            type: 'image_url',
                            image_url: { url: dataUri }
                        }
                    ]
                }
            ],
            temperature: 0.1,
            max_tokens: 512,
            response_format: { type: 'json_object' }
        };

        const groqRes = await fetchAllowed(GROQ_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${groqApiKey}`
            },
            body: JSON.stringify(groqPayload)
        }, {
            timeoutMs: 12000,
        });

        if (!groqRes.ok) {
            const errText = await groqRes.text();
            console.error('Groq API error:', groqRes.status, errText);
            return NextResponse.json(
                { error: `Error de Groq (${groqRes.status}): ${errText.slice(0, 200)}` },
                { status: 502 }
            );
        }

        const groqData = await groqRes.json();
        const rawText = groqData?.choices?.[0]?.message?.content;

        if (!rawText) {
            return NextResponse.json({ error: 'Respuesta vacía de Groq' }, { status: 502 });
        }

        // Parse JSON response
        let parsed: any;
        try {
            const clean = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            parsed = JSON.parse(clean);
        } catch {
            console.error('Failed to parse Groq response:', rawText);
            return NextResponse.json({ error: 'No se pudo parsear la respuesta', raw: rawText }, { status: 502 });
        }

        if (parsed.error) {
            return NextResponse.json({ error: parsed.error }, { status: 422 });
        }

        // ── Increment daily scan count (only for non-admin) ──
        if (!isAdmin) {
            const { data: existingUsage } = await supabaseAdmin
                .from('ScanUsage').select('id, count').eq('userId', currentUser.id).eq('date', todayStr).maybeSingle();
            if (existingUsage) {
                await supabaseAdmin.from('ScanUsage').update({ count: existingUsage.count + 1 }).eq('id', existingUsage.id);
            } else {
                await supabaseAdmin.from('ScanUsage').insert({ userId: currentUser.id, date: todayStr, count: 1 });
            }
        }

        // ── Get remaining scans info ──
        let remaining: number | null = null;
        if (!isAdmin) {
            const { data: usage } = await supabaseAdmin
                .from('ScanUsage').select('count').eq('userId', currentUser.id).eq('date', todayStr).maybeSingle();
            remaining = DAILY_SCAN_LIMIT - (usage?.count ?? 0);
        }

        return NextResponse.json({
            amount: parsed.amount,
            currency: parsed.currency ?? 'USD',
            desc: parsed.desc ?? '',
            tag: parsed.tag ?? 'otro',
            date: parsed.date ?? new Date().toISOString().split('T')[0],
            details: parsed.details ?? '',
            confidence: parsed.confidence ?? 70,
            remaining, // null for admins (unlimited), number for regular users
        });

    } catch (err: any) {
        console.error('scan-ticket error:', err);
        return NextResponse.json({ error: err.message ?? 'Error interno' }, { status: 500 });
    }
}
