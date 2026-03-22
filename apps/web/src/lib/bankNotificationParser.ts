/**
 * bankNotificationParser.ts
 * Pure regex-based parser for banking push notifications.
 * Zero AI calls — works offline, instant, no rate limits.
 *
 * Supported banks:
 *   Israel  : Bank Hapoalim, Bank Leumi, Discount, Mizrahi, Max (credit), CAL, Isracard, One Zero
 *   Argentina: Mercado Pago, Ualá, Brubank, Naranja X, Galicia, BBVA
 *   Global  : PayPal, Wise, Revolut
 */

export interface ParsedNotification {
    amount: number;
    currency: 'ILS' | 'USD' | 'ARS' | 'EUR' | 'GBP';
    merchant: string;
    type: 'expense' | 'income';
    tag: string;
    rawText: string;
    bankId: string;
    confidence: number; // 0-100
}

export interface BankRule {
    id: string;
    name: string;
    /** Android package names that send these notifications */
    packages: string[];
    /** Try these rules in order — first match wins */
    patterns: NotificationPattern[];
}

interface NotificationPattern {
    /** Matches the notification body */
    bodyRegex: RegExp;
    type: 'expense' | 'income';
    /** Named groups: amount, currency(?), merchant(?) */
    extract: (m: RegExpMatchArray) => Partial<ParsedNotification>;
}

// ─────────────────────────────────────────────────────────────
// Helper: clean merchant name
// ─────────────────────────────────────────────────────────────
function cleanMerchant(raw: string): string {
    return raw
        .replace(/[*_#|]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 60);
}

function detectTag(merchant: string): string {
    const m = merchant.toLowerCase();
    if (/super|market|maxi|jumbo|carrefour|disco|coto|walmart|רמי לוי|שופרסל|ויקטורי|מגא|יינות/.test(m)) return 'alimentacion';
    if (/uber|cabify|bolt|remis|taxi|train|bus|metro|רכבת|דן|egged|אגד/.test(m)) return 'transporte';
    if (/netflix|spotify|disney|amazon prime|hbo|apple|youtube|באנדל/.test(m)) return 'suscripcion';
    if (/farmaci|pharmacy|medical|hospital|clinica|בית חולים|מרפאה|רופא|kabi/.test(m)) return 'salud';
    if (/restaurant|cafe|pizza|burger|mcdonalds|kfc|sushi|פיצה|המבורגר|מסעדה/.test(m)) return 'alimentacion';
    if (/amazon|aliexpress|ebay|mercadolibre|tienda/.test(m)) return 'tecnologia';
    if (/gym|sport|fitness|חדר כושר/.test(m)) return 'entretenimiento';
    if (/hotel|airbnb|booking|flight|vuelo|אל על|אל על/.test(m)) return 'viajes';
    return 'otro';
}

// ─────────────────────────────────────────────────────────────
// BANK RULES
// ─────────────────────────────────────────────────────────────
export const BANK_RULES: BankRule[] = [

    // ── Max (formerly Leumi Card) ────────────────────────────
    {
        id: 'max_il',
        name: 'Max (Israel)',
        packages: ['com.leumi.leumiwallet', 'com.max.mobile'],
        patterns: [
            {
                // "חיוב בסך 45.90 ₪ ב-Super Pharm"
                bodyRegex: /חיוב בסך ([\d,]+\.?\d*)\s*[₪ש"ח]\s*ב[-–]?\s*(.+)/u,
                type: 'expense',
                extract: (m) => ({
                    amount: parseFloat(m[1].replace(',', '')),
                    currency: 'ILS',
                    merchant: cleanMerchant(m[2]),
                    tag: detectTag(m[2]),
                }),
            },
            {
                // "עסקה על סך 120.00 ₪ בAmazon"
                bodyRegex: /עסקה על סך ([\d,]+\.?\d*)\s*[₪ש"ח]\s*ב?(.+)/u,
                type: 'expense',
                extract: (m) => ({
                    amount: parseFloat(m[1].replace(',', '')),
                    currency: 'ILS',
                    merchant: cleanMerchant(m[2]),
                    tag: detectTag(m[2]),
                }),
            },
        ],
    },

    // ── Bank Hapoalim ────────────────────────────────────────
    {
        id: 'hapoalim_il',
        name: 'Bank Hapoalim',
        packages: ['com.ideomobile.hapoalim', 'com.bankhapoalim.mobile'],
        patterns: [
            {
                // "בוצעה עסקת חיוב בסכום 89.90 ש"ח ב-Rami Levy"
                bodyRegex: /עסקת חיוב בסכום ([\d,]+\.?\d*)\s*(?:ש"ח|₪)\s*ב[-–]?\s*(.+)/u,
                type: 'expense',
                extract: (m) => ({
                    amount: parseFloat(m[1].replace(',', '')),
                    currency: 'ILS',
                    merchant: cleanMerchant(m[2]),
                    tag: detectTag(m[2]),
                }),
            },
            {
                // "הועבר לחשבונך סך 500 ₪"
                bodyRegex: /הועבר לחשבונך סך ([\d,]+\.?\d*)\s*[₪ש"ח]/u,
                type: 'income',
                extract: (m) => ({
                    amount: parseFloat(m[1].replace(',', '')),
                    currency: 'ILS',
                    merchant: 'Bank Hapoalim',
                    tag: 'servicios',
                }),
            },
        ],
    },

    // ── Bank Leumi ───────────────────────────────────────────
    {
        id: 'leumi_il',
        name: 'Bank Leumi',
        packages: ['com.ideomobile.leumi', 'il.co.yahav.gmach', 'com.leumidigital.android'],
        patterns: [
            {
                // "חויבת בסך 200.00 ₪ ב Shufersal"
                bodyRegex: /חויב[את]+\s*בסך\s*([\d,]+\.?\d*)\s*[₪ש"ח]\s*ב?\s*(.+)/u,
                type: 'expense',
                extract: (m) => ({
                    amount: parseFloat(m[1].replace(',', '')),
                    currency: 'ILS',
                    merchant: cleanMerchant(m[2]),
                    tag: detectTag(m[2]),
                }),
            },
        ],
    },

    // ── Discount Bank ────────────────────────────────────────
    {
        id: 'discount_il',
        name: 'Discount Bank',
        packages: ['com.discountbank.mobile', 'com.ideomobile.discount'],
        patterns: [
            {
                // "בוצעה עסקה בסכום 55.00 ₪ ב Mega"
                bodyRegex: /בוצעה עסקה בסכום ([\d,]+\.?\d*)\s*[₪ש"ח]\s*ב?\s*(.+)/u,
                type: 'expense',
                extract: (m) => ({
                    amount: parseFloat(m[1].replace(',', '')),
                    currency: 'ILS',
                    merchant: cleanMerchant(m[2]),
                    tag: detectTag(m[2]),
                }),
            },
        ],
    },

    // ── CAL / Isracard ───────────────────────────────────────
    {
        id: 'cal_il',
        name: 'CAL / Isracard',
        packages: ['com.cal.calapp', 'com.isracard.android'],
        patterns: [
            {
                // "ביצעת רכישה בסך ₪180.50 ב-Victory"
                bodyRegex: /ביצעת רכישה בסך\s*[₪ש"ח]?([\d,]+\.?\d*)\s*ב[-–]?\s*(.+)/u,
                type: 'expense',
                extract: (m) => ({
                    amount: parseFloat(m[1].replace(',', '')),
                    currency: 'ILS',
                    merchant: cleanMerchant(m[2]),
                    tag: detectTag(m[2]),
                }),
            },
        ],
    },

    // ── One Zero Bank ────────────────────────────────────────
    {
        id: 'onezero_il',
        name: 'One Zero Bank',
        packages: ['com.onezero.android'],
        patterns: [
            {
                // "Charged ₪45.00 at Aroma"
                bodyRegex: /Charged\s+[₪ILS]*([\d,]+\.?\d*)\s+at\s+(.+)/i,
                type: 'expense',
                extract: (m) => ({
                    amount: parseFloat(m[1].replace(',', '')),
                    currency: 'ILS',
                    merchant: cleanMerchant(m[2]),
                    tag: detectTag(m[2]),
                }),
            },
        ],
    },

    // ── Mercado Pago (Argentina) ─────────────────────────────
    {
        id: 'mercadopago_ar',
        name: 'Mercado Pago',
        packages: [
            'com.mercadopago.wallet.android',
            'com.mercadopago.android.mp',
            'com.mercadopago.wallet',
            'com.mercadopago.android'
        ],
        patterns: [
            {
                // "Ingresaste $ 500 y ya están generando rendimientos"
                bodyRegex: /Ingresaste\s+\$\s*([\d.,]+)/i,
                type: 'income',
                extract: (m) => ({
                    amount: parseFloat(m[1].replace(/\s/g, '').replace(/\./g, '').replace(',', '.')),
                    currency: 'ARS',
                    merchant: 'Mercado Pago (Ingreso)',
                    tag: 'servicios',
                }),
            },
            {
                // "Pagaste $1.250 en McDonald's"
                bodyRegex: /Pagaste\s+\$\s*([\d.,]+)\s+en\s+(.+)/i,
                type: 'expense',
                extract: (m) => ({
                    amount: parseFloat(m[1].replace(/\s/g, '').replace(/\./g, '').replace(',', '.')),
                    currency: 'ARS',
                    merchant: cleanMerchant(m[2]),
                    tag: detectTag(m[2]),
                }),
            },
            {
                // "Te llegaron $5.000 de Juan"
                bodyRegex: /Te llegaron\s+\$\s*([\d.,]+)\s+de\s+(.+)/i,
                type: 'income',
                extract: (m) => ({
                    amount: parseFloat(m[1].replace(/\s/g, '').replace(/\./g, '').replace(',', '.')),
                    currency: 'ARS',
                    merchant: cleanMerchant(m[2]),
                    tag: 'servicios',
                }),
            },
            {
                // "Transferiste $2.000 a Pedro"
                bodyRegex: /Transferiste\s+\$\s*([\d.,]+)\s+a\s+(.+)/i,
                type: 'expense',
                extract: (m) => ({
                    amount: parseFloat(m[1].replace(/\s/g, '').replace(/\./g, '').replace(',', '.')),
                    currency: 'ARS',
                    merchant: cleanMerchant(m[2]),
                    tag: 'servicios',
                }),
            },
        ],
    },

    // ── Ualá (Argentina) ─────────────────────────────────────
    {
        id: 'uala_ar',
        name: 'Ualá',
        packages: ['ar.uala'],
        patterns: [
            {
                // "Realizaste un pago de $890 en Carrefour"
                bodyRegex: /Realizaste un pago de\s+\$\s*([\d.,]+)\s+en\s+(.+)/i,
                type: 'expense',
                extract: (m) => ({
                    amount: parseFloat(m[1].replace(/\./g, '').replace(',', '.')),
                    currency: 'ARS',
                    merchant: cleanMerchant(m[2]),
                    tag: detectTag(m[2]),
                }),
            },
        ],
    },

    // ── Brubank (Argentina) ──────────────────────────────────
    {
        id: 'brubank_ar',
        name: 'Brubank',
        packages: ['com.brubank', 'com.brubank.mobile', 'ar.com.brubank.wallet'],
        patterns: [
            {
                // "Adriel Jair Camacho Chapachnik te envió $ 500"
                bodyRegex: /(.+)\s+te envió\s+\$\s*([\d.,]+)/i,
                type: 'income',
                extract: (m) => ({
                    amount: parseFloat(m[2].replace(/\./g, '').replace(',', '.')),
                    currency: 'ARS',
                    merchant: cleanMerchant(m[1]),
                    tag: 'servicios',
                }),
            },
            {
                // "Brubank: debitamos $450.00 de tu cuenta en YPF"
                bodyRegex: /debitamos\s+\$\s*([\d.,]+)\s+de tu cuenta en\s+(.+)/i,
                type: 'expense',
                extract: (m) => ({
                    amount: parseFloat(m[1].replace(/\./g, '').replace(',', '.')),
                    currency: 'ARS',
                    merchant: cleanMerchant(m[2]),
                    tag: detectTag(m[2]),
                }),
            },
            {
                // "Transferiste $2.500 a Juan Perez"
                bodyRegex: /Transferiste\s+\$\s*([\d.,]+)\s+a\s+(.+)/i,
                type: 'expense',
                extract: (m) => ({
                    amount: parseFloat(m[1].replace(/\./g, '').replace(',', '.')),
                    currency: 'ARS',
                    merchant: cleanMerchant(m[2]),
                    tag: 'servicios',
                }),
            },
            {
                // "Recibiste $5.000 de Pedro"
                bodyRegex: /Recibiste\s+\$\s*([\d.,]+)\s+de\s+(.+)/i,
                type: 'income',
                extract: (m) => ({
                    amount: parseFloat(m[1].replace(/\./g, '').replace(',', '.')),
                    currency: 'ARS',
                    merchant: cleanMerchant(m[2]),
                    tag: 'servicios',
                }),
            },
            {
                // "Pago de $1.200 en Coto"
                bodyRegex: /Pago de\s+\$\s*([\d.,]+)\s+en\s+(.+)/i,
                type: 'expense',
                extract: (m) => ({
                    amount: parseFloat(m[1].replace(/\./g, '').replace(',', '.')),
                    currency: 'ARS',
                    merchant: cleanMerchant(m[2]),
                    tag: detectTag(m[2]),
                }),
            },
        ],
    },

    // ── Naranja X (Argentina) ────────────────────────────────
    {
        id: 'naranjax_ar',
        name: 'Naranja X',
        packages: ['com.naranjax.android'],
        patterns: [
            {
                // "Compraste $1.800 en Farmacity con tu tarjeta"
                bodyRegex: /Compraste\s+\$\s*([\d.,]+)\s+en\s+(.+?)(?:\s+con tu tarjeta)?$/i,
                type: 'expense',
                extract: (m) => ({
                    amount: parseFloat(m[1].replace(/\./g, '').replace(',', '.')),
                    currency: 'ARS',
                    merchant: cleanMerchant(m[2]),
                    tag: detectTag(m[2]),
                }),
            },
        ],
    },

    // ── PayPal (Global) ──────────────────────────────────────
    {
        id: 'paypal',
        name: 'PayPal',
        packages: ['com.paypal.android.p2pmobile'],
        patterns: [
            {
                // "You sent $25.00 to John Doe"  /  "You paid $12.99 to Netflix"
                bodyRegex: /You (?:sent|paid)\s+\$?\s*([\d,.]+)\s+(?:USD\s+)?to\s+(.+)/i,
                type: 'expense',
                extract: (m) => ({
                    amount: parseFloat(m[1].replace(',', '')),
                    currency: 'USD',
                    merchant: cleanMerchant(m[2]),
                    tag: detectTag(m[2]),
                }),
            },
            {
                // "You received $50.00 from Jane"
                bodyRegex: /You received\s+\$?\s*([\d,.]+)\s+from\s+(.+)/i,
                type: 'income',
                extract: (m) => ({
                    amount: parseFloat(m[1].replace(',', '')),
                    currency: 'USD',
                    merchant: cleanMerchant(m[2]),
                    tag: 'servicios',
                }),
            },
        ],
    },

    // ── Wise (Global) ────────────────────────────────────────
    {
        id: 'wise',
        name: 'Wise',
        packages: ['com.transferwise.android'],
        patterns: [
            {
                // "You spent USD 45.99 at Amazon"
                bodyRegex: /You spent\s+([A-Z]{3})\s+([\d,.]+)\s+at\s+(.+)/i,
                type: 'expense',
                extract: (m) => ({
                    amount: parseFloat(m[2].replace(',', '')),
                    currency: (m[1].toUpperCase() as any) || 'USD',
                    merchant: cleanMerchant(m[3]),
                    tag: detectTag(m[3]),
                }),
            },
            {
                // "You received EUR 200.00"
                bodyRegex: /You received\s+([A-Z]{3})\s+([\d,.]+)/i,
                type: 'income',
                extract: (m) => ({
                    amount: parseFloat(m[2].replace(',', '')),
                    currency: (m[1].toUpperCase() as any) || 'USD',
                    merchant: 'Wise',
                    tag: 'servicios',
                }),
            },
        ],
    },

    // ── Revolut (Global) ─────────────────────────────────────
    {
        id: 'revolut',
        name: 'Revolut',
        packages: ['com.revolut.revolut'],
        patterns: [
            {
                // "You spent €12.50 at Starbucks"
                bodyRegex: /You spent\s+([€$£₪]|[A-Z]{3}\s*)([\d,.]+)\s+at\s+(.+)/i,
                type: 'expense',
                extract: (m) => {
                    const symbolMap: Record<string, ParsedNotification['currency']> = {
                        '€': 'EUR', '$': 'USD', '£': 'GBP', '₪': 'ILS'
                    };
                    const sym = m[1].trim();
                    return {
                        amount: parseFloat(m[2].replace(',', '')),
                        currency: symbolMap[sym] || 'EUR',
                        merchant: cleanMerchant(m[3]),
                        tag: detectTag(m[3]),
                    };
                },
            },
        ],
    },

    // ── Google Pay / Google Wallet ───────────────────────────
    {
        id: 'google_pay',
        name: 'Google Pay',
        packages: [
            'com.google.android.apps.walletnfcrel',  // Google Wallet (main)
            'com.google.android.gms',                 // Google Play Services (some regions)
            'com.google.android.apps.wallet',         // older Google Pay
        ],
        patterns: [
            {
                // LATAM / Argentina: "$0.99 con Mastercard ••6414"
                // The notification title is the merchant (e.g. "AFK Journey")
                // The body is the amount + card
                bodyRegex: /\$\s*([\d,.]+)\s+con\s+(\w+)\s*[•·*]{2,}\d+/i,
                type: 'expense',
                extract: (m) => ({
                    amount: parseFloat(m[1].replace(/\./g, '').replace(',', '.')),
                    currency: 'USD',   // Google Wallet LATAM shows USD by default
                    merchant: 'Google Wallet',  // title is the merchant but we only have body here
                    tag: 'tecnologia',
                }),
            },
            {
                // "You paid $12.50 at Starbucks with Google Pay"
                // "You paid USD 12.50 at Amazon"
                bodyRegex: /You paid\s+([A-Z]{3}\s*|[€$£₪])([\d,.]+)\s+(?:[A-Z]{3}\s+)?(?:at|to)\s+(.+?)(?:\s+with Google Pay)?$/i,
                type: 'expense',
                extract: (m) => {
                    const symbolMap: Record<string, ParsedNotification['currency']> = {
                        '€': 'EUR', '$': 'USD', '£': 'GBP', '₪': 'ILS'
                    };
                    const sym = m[1].trim();
                    const currency = symbolMap[sym] ?? (sym.length === 3 ? sym as any : 'USD');
                    return {
                        amount: parseFloat(m[2].replace(',', '')),
                        currency,
                        merchant: cleanMerchant(m[3]),
                        tag: detectTag(m[3]),
                    };
                },
            },
            {
                // "Payment of $45.00 to Netflix"
                bodyRegex: /Payment of\s+([A-Z]{3}\s*|[€$£₪])([\d,.]+)\s+to\s+(.+)/i,
                type: 'expense',
                extract: (m) => {
                    const symbolMap: Record<string, ParsedNotification['currency']> = {
                        '€': 'EUR', '$': 'USD', '£': 'GBP', '₪': 'ILS'
                    };
                    const sym = m[1].trim();
                    return {
                        amount: parseFloat(m[2].replace(',', '')),
                        currency: symbolMap[sym] ?? 'USD',
                        merchant: cleanMerchant(m[3]),
                        tag: detectTag(m[3]),
                    };
                },
            },
            {
                // "₪89.90 charged to your Visa ending in 1234 at Super Pharm"
                bodyRegex: /([₪€$£])([\d,.]+)\s+charged to your .+?at\s+(.+)/i,
                type: 'expense',
                extract: (m) => {
                    const symbolMap: Record<string, ParsedNotification['currency']> = {
                        '€': 'EUR', '$': 'USD', '£': 'GBP', '₪': 'ILS'
                    };
                    return {
                        amount: parseFloat(m[2].replace(',', '')),
                        currency: symbolMap[m[1]] ?? 'USD',
                        merchant: cleanMerchant(m[3]),
                        tag: detectTag(m[3]),
                    };
                },
            },
            {
                // "You received $50.00 from John via Google Pay"
                bodyRegex: /You received\s+([A-Z]{3}\s*|[€$£₪])([\d,.]+)\s+from\s+(.+?)(?:\s+via Google Pay)?$/i,
                type: 'income',
                extract: (m) => {
                    const symbolMap: Record<string, ParsedNotification['currency']> = {
                        '€': 'EUR', '$': 'USD', '£': 'GBP', '₪': 'ILS'
                    };
                    const sym = m[1].trim();
                    return {
                        amount: parseFloat(m[2].replace(',', '')),
                        currency: symbolMap[sym] ?? 'USD',
                        merchant: cleanMerchant(m[3]),
                        tag: 'servicios',
                    };
                },
            },
        ],
    },
];

// ─────────────────────────────────────────────────────────────
// Main parse function
// ─────────────────────────────────────────────────────────────
/**
 * Try to parse a notification from a known banking app.
 * @param packageName  Android package name of the sending app
 * @param body         Notification body text
 * @returns ParsedNotification or null if not recognized
 */
export function parseBankNotification(
    packageName: string,
    body: string
): ParsedNotification | null {
    // Find the bank rule for this package
    const rule = BANK_RULES.find(r => r.packages.includes(packageName));
    if (!rule) return null;

    for (const pattern of rule.patterns) {
        const match = body.match(pattern.bodyRegex);
        if (match) {
            const extracted = pattern.extract(match);
            if (!extracted.amount || extracted.amount <= 0) continue;

            return {
                amount: extracted.amount!,
                currency: extracted.currency ?? 'USD',
                merchant: extracted.merchant ?? rule.name,
                type: extracted.type ?? pattern.type,
                tag: extracted.tag ?? 'otro',
                rawText: body,
                bankId: rule.id,
                confidence: 95,
            };
        }
    }

    return null;
}

/**
 * Get all known package names for notification listener whitelisting
 */
export const ALL_BANK_PACKAGES = BANK_RULES.flatMap(r => r.packages);
