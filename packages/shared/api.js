// ── API client utilities ───────────────────────────────────────────────────
// Pure functions — no platform dependencies. Works in Next.js and React Native.

const DEFAULT_API_BASE = 'https://zafe.vercel.app';

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
  return raw.endsWith('/') ? raw.slice(0, -1) : raw;
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
