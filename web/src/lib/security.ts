import { NextResponse } from 'next/server';

export type RateLimitOptions = {
    key: string;
    limit: number;
    windowMs: number;
};

type RateLimitEntry = {
    count: number;
    resetAt: number;
};

const globalStore = globalThis as typeof globalThis & {
    __safedRateLimitStore?: Map<string, RateLimitEntry>;
};

const rateLimitStore = globalStore.__safedRateLimitStore ?? new Map<string, RateLimitEntry>();

if (!globalStore.__safedRateLimitStore) {
    globalStore.__safedRateLimitStore = rateLimitStore;
}

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const USERNAME_REGEX = /^[A-Za-z0-9._-]{3,32}$/;
export const DATE_INPUT_REGEX = /^\d{4}[-/]\d{2}[-/]\d{2}$/;
export const CARD_DIGITS_REGEX = /^\d{4}$/;
export const TRANSACTION_TYPE_VALUES = ['income', 'expense'] as const;
export const GOAL_TYPE_VALUES = ['unico', 'mensual', 'periodo', 'meta'] as const;
export const PAYMENT_METHOD_VALUES = ['', 'billete', 'tarjeta'] as const;
export const IMAGE_MIME_TYPE_VALUES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'] as const;

const ALLOWED_OUTBOUND_HOSTS = new Set([
    'api.exchangerate-api.com',
    'dolarapi.com',
    'api.groq.com',
]);

type TransactionType = (typeof TRANSACTION_TYPE_VALUES)[number];
type GoalType = (typeof GOAL_TYPE_VALUES)[number];
type PaymentMethod = (typeof PAYMENT_METHOD_VALUES)[number];

const TRANSACTION_TYPES = new Set<string>(TRANSACTION_TYPE_VALUES);
const GOAL_TYPES = new Set<string>(GOAL_TYPE_VALUES);
const PAYMENT_METHODS = new Set<string>(PAYMENT_METHOD_VALUES);
const IMAGE_MIME_TYPES = new Set<string>(IMAGE_MIME_TYPE_VALUES);

type SanitizedTransaction = {
    desc: string;
    amount: number;
    amountUSD: number | null;
    amountARS: number | null;
    amountILS: number | null;
    amountEUR: number | null;
    tag: string;
    type: TransactionType;
    date: string;
    icon: string;
    details: string;
    excludeFromBudget: boolean;
    goalType: GoalType;
    isCancelled: boolean;
    periodicity: number | null;
    paymentMethod: PaymentMethod | null;
    cardDigits: string | null;
};

type SanitizeOptions = {
    partial?: boolean;
};

export const normalizeEmail = (value: unknown) =>
    typeof value === 'string' ? value.trim().toLowerCase() : '';

export const normalizeUsername = (value: unknown) =>
    typeof value === 'string' ? value.trim() : '';

const parseOriginCandidate = (value: string | null | undefined) => {
    if (!value) return null;

    const candidate = value.split(',')[0]?.trim();
    if (!candidate) return null;

    try {
        const url = new URL(candidate);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            return null;
        }

        return url.origin;
    } catch {
        return null;
    }
};

const buildOriginFromParts = (protocol: string | null | undefined, host: string | null | undefined) => {
    const normalizedProtocol = protocol?.split(',')[0]?.trim();
    const normalizedHost = host?.split(',')[0]?.trim();

    if (!normalizedProtocol || !normalizedHost) {
        return null;
    }

    return parseOriginCandidate(`${normalizedProtocol}://${normalizedHost}`);
};

const isLoopbackHostname = (hostname: string) => {
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1';
};

const areEquivalentOrigins = (left: string, right: string) => {
    if (left === right) {
        return true;
    }

    try {
        const leftUrl = new URL(left);
        const rightUrl = new URL(right);

        return (
            leftUrl.protocol === rightUrl.protocol
            && leftUrl.port === rightUrl.port
            && isLoopbackHostname(leftUrl.hostname)
            && isLoopbackHostname(rightUrl.hostname)
        );
    } catch {
        return false;
    }
};

export function getAppOrigin(req: Request) {
    const configuredOrigin = parseOriginCandidate(process.env.NEXT_PUBLIC_APP_URL);
    if (configuredOrigin) {
        return configuredOrigin;
    }

    const forwardedOrigin = buildOriginFromParts(
        req.headers.get('x-forwarded-proto'),
        req.headers.get('x-forwarded-host') ?? req.headers.get('host'),
    );

    if (forwardedOrigin) {
        return forwardedOrigin;
    }

    return new URL(req.url).origin;
}

export const isSafePasswordCandidate = (value: unknown) =>
    typeof value === 'string' && value.length >= 8 && value.length <= 128;

export const isValidImageMimeType = (value: unknown): value is (typeof IMAGE_MIME_TYPE_VALUES)[number] =>
    typeof value === 'string' && IMAGE_MIME_TYPES.has(value);

export const isValidDateInput = (value: unknown) =>
    typeof value === 'string' && DATE_INPUT_REGEX.test(value.trim());

const normalizeTransactionDateInput = (value: unknown) => {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }

    if (DATE_INPUT_REGEX.test(trimmed)) {
        return trimmed.replace(/\//g, '-');
    }

    const dayFirstMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2}|\d{4})$/);
    if (!dayFirstMatch) {
        return null;
    }

    const [, dayRaw, monthRaw, yearRaw] = dayFirstMatch;
    const day = Number(dayRaw);
    const month = Number(monthRaw);
    const parsedYear = Number(yearRaw);
    const year = yearRaw.length === 2 ? 2000 + parsedYear : parsedYear;

    const candidate = new Date(year, month - 1, day);
    const isSameDate = (
        candidate.getFullYear() === year
        && candidate.getMonth() === month - 1
        && candidate.getDate() === day
    );

    if (!isSameDate) {
        return null;
    }

    return [
        String(year).padStart(4, '0'),
        String(month).padStart(2, '0'),
        String(day).padStart(2, '0'),
    ].join('-');
};

export const normalizeTagInput = (value: unknown) =>
    typeof value === 'string'
        ? value.trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        : '';

export function normalizeText(value: unknown, maxLength: number, fallback = '') {
    if (typeof value !== 'string') return fallback;
    return value.trim().slice(0, maxLength);
}

export function getRequiredServerEnv(name: string) {
    const value = process.env[name];
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new Error(`missing_server_env:${name}`);
    }

    return value.trim();
}

function assertAllowedOutboundUrl(input: string | URL) {
    const url = input instanceof URL ? input : new URL(input);

    if (url.protocol !== 'https:') {
        throw new Error('outbound_protocol_not_allowed');
    }

    if (!ALLOWED_OUTBOUND_HOSTS.has(url.hostname)) {
        throw new Error('outbound_host_not_allowed');
    }

    return url;
}

type AllowedFetchOptions = {
    timeoutMs?: number;
};

export async function fetchAllowed(input: string | URL, init: RequestInit = {}, options: AllowedFetchOptions = {}) {
    const url = assertAllowedOutboundUrl(input);
    const controller = new AbortController();
    const timeoutMs = options.timeoutMs ?? 5000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        return await fetch(url, {
            ...init,
            signal: controller.signal,
        });
    } catch (error: any) {
        if (error?.name === 'AbortError') {
            throw new Error('outbound_timeout');
        }

        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}

export async function fetchAllowedJson<T>(input: string | URL, init: RequestInit = {}, options: AllowedFetchOptions = {}) {
    const response = await fetchAllowed(input, init, options);
    if (!response.ok) {
        throw new Error(`outbound_http_${response.status}`);
    }

    const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
    if (!contentType.includes('application/json')) {
        throw new Error('outbound_invalid_content_type');
    }

    return response.json() as Promise<T>;
}

function toOptionalFiniteNumber(value: unknown) {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;

    const parsed = Number(value);
    if (!Number.isFinite(parsed) || Math.abs(parsed) > 1_000_000_000) return NaN;
    return parsed;
}

function toRequiredAmount(value: unknown) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0 || Math.abs(parsed) > 1_000_000_000) return NaN;
    return parsed;
}

function toOptionalInteger(value: unknown) {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;

    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 120) return NaN;
    return parsed;
}

export function sanitizeTransactionInput(payload: any, options: SanitizeOptions = {}) {
    const partial = options.partial === true;

    const desc = payload?.desc === undefined
        ? (partial ? undefined : 'Sin título')
        : normalizeText(payload.desc, 160, 'Sin título');

    const tag = payload?.tag === undefined
        ? (partial ? undefined : 'OTROS')
        : normalizeTagInput(payload.tag).slice(0, 64);

    const type = payload?.type === undefined
        ? (partial ? undefined : 'expense')
        : String(payload.type);

    const date = payload?.date === undefined
        ? (partial ? undefined : new Date().toISOString().split('T')[0])
        : normalizeTransactionDateInput(payload.date);

    const icon = payload?.icon === undefined
        ? (partial ? undefined : '💳')
        : normalizeText(payload.icon, 8, '💳');

    const details = payload?.details === undefined
        ? (partial ? undefined : '')
        : normalizeText(payload.details, 500, '');

    const goalType = payload?.goalType === undefined
        ? (partial ? undefined : 'unico')
        : String(payload.goalType);

    const paymentMethod = payload?.paymentMethod === undefined
        ? (partial ? undefined : null)
        : (payload.paymentMethod === null ? null : String(payload.paymentMethod));

    if (!partial || payload?.amount !== undefined) {
        const amount = toRequiredAmount(payload?.amount);
        if (!Number.isFinite(amount)) return { error: 'invalid_amount' as const };
        if (!partial && amount <= 0) return { error: 'invalid_amount' as const };
    }

    if (desc !== undefined && desc.length === 0) return { error: 'invalid_desc' as const };
    if (tag !== undefined && tag.length === 0) return { error: 'invalid_tag' as const };
    if (type !== undefined && !TRANSACTION_TYPES.has(type)) return { error: 'invalid_type' as const };
    if (date === null) return { error: 'invalid_date' as const };
    if (date !== undefined && !isValidDateInput(date)) return { error: 'invalid_date' as const };
    if (goalType !== undefined && !GOAL_TYPES.has(goalType)) return { error: 'invalid_goal_type' as const };
    if (paymentMethod !== undefined && paymentMethod !== null && !PAYMENT_METHODS.has(paymentMethod)) return { error: 'invalid_payment_method' as const };

    const amountUSD = toOptionalFiniteNumber(payload?.amountUSD);
    const amountARS = toOptionalFiniteNumber(payload?.amountARS);
    const amountILS = toOptionalFiniteNumber(payload?.amountILS);
    const amountEUR = toOptionalFiniteNumber(payload?.amountEUR);
    const periodicity = toOptionalInteger(payload?.periodicity);

    if ([amountUSD, amountARS, amountILS, amountEUR, periodicity].some(value => Number.isNaN(value))) {
        return { error: 'invalid_numeric_field' as const };
    }

    const cardDigits = payload?.cardDigits === undefined
        ? (partial ? undefined : null)
        : (payload.cardDigits === null || payload.cardDigits === '' ? null : String(payload.cardDigits).replace(/\D/g, '').slice(0, 4));

    if (cardDigits !== undefined && cardDigits !== null && !CARD_DIGITS_REGEX.test(cardDigits)) {
        return { error: 'invalid_card_digits' as const };
    }

    if (paymentMethod === 'tarjeta' && cardDigits == null) {
        return { error: 'invalid_card_digits' as const };
    }

    const sanitized: Partial<SanitizedTransaction> = {};

    if (desc !== undefined) sanitized.desc = desc;
    if (!partial || payload?.amount !== undefined) sanitized.amount = Number(payload.amount);
    if (amountUSD !== undefined) sanitized.amountUSD = amountUSD;
    if (amountARS !== undefined) sanitized.amountARS = amountARS;
    if (amountILS !== undefined) sanitized.amountILS = amountILS;
    if (amountEUR !== undefined) sanitized.amountEUR = amountEUR;
    if (tag !== undefined) sanitized.tag = tag;
    if (type !== undefined) sanitized.type = type as TransactionType;
    if (date !== undefined) sanitized.date = date;
    if (icon !== undefined) sanitized.icon = icon;
    if (details !== undefined) sanitized.details = details;
    if (payload?.excludeFromBudget !== undefined || !partial) sanitized.excludeFromBudget = !!payload?.excludeFromBudget;
    if (goalType !== undefined) sanitized.goalType = goalType as GoalType;
    if (payload?.isCancelled !== undefined || !partial) sanitized.isCancelled = !!payload?.isCancelled;
    if (periodicity !== undefined) sanitized.periodicity = periodicity;
    if (paymentMethod !== undefined) sanitized.paymentMethod = paymentMethod as PaymentMethod | null;
    if (cardDigits !== undefined) sanitized.cardDigits = cardDigits;

    return { data: sanitized } as const;
}

export function getClientIp(req: Request) {
    const forwardedFor = req.headers.get('x-forwarded-for');
    if (forwardedFor) {
        return forwardedFor.split(',')[0]?.trim() || 'unknown';
    }

    return req.headers.get('x-real-ip') ?? 'unknown';
}

const getRateLimitKey = (req: Request, options: RateLimitOptions) => {
    const ip = getClientIp(req);
    return `${options.key}:${ip}`;
};

export function getRateLimitStatus(req: Request, options: RateLimitOptions) {
    const now = Date.now();
    const rateKey = getRateLimitKey(req, options);
    const current = rateLimitStore.get(rateKey);

    if (!current || current.resetAt <= now) {
        return {
            limited: false,
            retryAfter: 0,
            canRetryAt: null,
        };
    }

    if (current.count >= options.limit) {
        return {
            limited: true,
            retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
            canRetryAt: new Date(current.resetAt).toISOString(),
        };
    }

    return {
        limited: false,
        retryAfter: 0,
        canRetryAt: null,
    };
}

export function resetRateLimit(req: Request, options: RateLimitOptions) {
    rateLimitStore.delete(getRateLimitKey(req, options));
}

export function enforceSameOrigin(req: Request) {
    const origin = req.headers.get('origin')?.trim();
    if (!origin || origin === 'null') return null;

    try {
        const parsedOrigin = new URL(origin);

        if (parsedOrigin.protocol !== 'http:' && parsedOrigin.protocol !== 'https:') {
            return null;
        }

        const allowedOrigins = [
            new URL(req.url).origin,
            getAppOrigin(req),
            buildOriginFromParts(
                req.headers.get('x-forwarded-proto'),
                req.headers.get('x-forwarded-host') ?? req.headers.get('host'),
            ),
        ].filter((value): value is string => Boolean(value));

        const isAllowed = allowedOrigins.some((allowedOrigin) => areEquivalentOrigins(parsedOrigin.origin, allowedOrigin));

        if (!isAllowed) {
            return NextResponse.json({ error: 'invalid_origin' }, { status: 403 });
        }
    } catch {
        return null;
    }

    return null;
}

export function consumeRateLimit(req: Request, options: RateLimitOptions) {
    const now = Date.now();
    const rateKey = getRateLimitKey(req, options);
    const current = rateLimitStore.get(rateKey);

    if (!current || current.resetAt <= now) {
        rateLimitStore.set(rateKey, { count: 1, resetAt: now + options.windowMs });
        return null;
    }

    if (current.count >= options.limit) {
        const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
        return NextResponse.json(
            {
                error: 'rate_limited',
                errorCode: 'rate_limited',
                retryAfter: retryAfterSeconds,
                canRetryAt: new Date(current.resetAt).toISOString(),
                requiresCaptcha: true,
            },
            {
                status: 429,
                headers: {
                    'Retry-After': String(retryAfterSeconds),
                },
            }
        );
    }

    current.count += 1;
    rateLimitStore.set(rateKey, current);
    return null;
}