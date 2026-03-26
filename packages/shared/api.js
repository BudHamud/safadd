// ── API client utilities ───────────────────────────────────────────────────
// Pure functions — no platform dependencies. Works in Next.js and React Native.

const DEFAULT_API_BASE = 'https://zafe.vercel.app';

function trimTrailingSlash(value) {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function isDevelopmentBuild() {
  if (typeof __DEV__ !== 'undefined') return __DEV__;
  if (typeof process === 'undefined') return false;
  return process.env.NODE_ENV !== 'production';
}

function isPrivateHostname(hostname) {
  const normalizedHost = hostname.toLowerCase();

  if (
    normalizedHost === 'localhost' ||
    normalizedHost === '127.0.0.1' ||
    normalizedHost === '0.0.0.0' ||
    normalizedHost === '::1' ||
    normalizedHost.endsWith('.local')
  ) {
    return true;
  }

  if (/^10\./.test(normalizedHost) || /^192\.168\./.test(normalizedHost)) {
    return true;
  }

  const match = normalizedHost.match(/^172\.(\d{1,3})\./);
  if (!match) return false;

  const secondOctet = Number(match[1]);
  return secondOctet >= 16 && secondOctet <= 31;
}

/**
 * Resolves the API base URL from env vars (supports both EXPO_PUBLIC_ and
 * NEXT_PUBLIC_ prefixes) with a fallback to the production URL.
 */
function getApiBase() {
  const raw = (
    (typeof process !== 'undefined' &&
      (process.env.EXPO_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_API_BASE)) ||
    ''
  ).trim();
  if (!raw) return DEFAULT_API_BASE;

  const normalizedBase = trimTrailingSlash(raw);

  try {
    const parsed = new URL(normalizedBase);
    const isDev = isDevelopmentBuild();

    if (!isDev && (parsed.protocol !== 'https:' || isPrivateHostname(parsed.hostname))) {
      return DEFAULT_API_BASE;
    }

    return normalizedBase;
  } catch {
    return DEFAULT_API_BASE;
  }
}

/**
 * Builds standard HTTP headers with optional Bearer token from a Supabase
 * session object (or anything with an `access_token` string field).
 */
function buildAuthHeaders(session, extraHeaders) {
  return {
    ...(extraHeaders || {}),
    ...(session && session.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {}),
  };
}

/**
 * Fetch wrapper that injects auth headers and resolves the API base URL.
 * Equivalent to the mobile `apiFetch` helper.
 */
async function apiFetch(path, options, session) {
  const headers = buildAuthHeaders(session || null, (options || {}).headers);
  return fetch(`${getApiBase()}${path}`, { ...(options || {}), headers });
}

module.exports = { DEFAULT_API_BASE, getApiBase, buildAuthHeaders, apiFetch };
