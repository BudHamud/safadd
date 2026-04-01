// ── API client utilities ───────────────────────────────────────────────────
// Pure functions — no platform dependencies. Works in Next.js and React Native.

const DEFAULT_API_BASE = 'https://zafe.vercel.app';
const API_REQUEST_TIMEOUT_MS = 12000;

function trimTrailingSlash(value) {
  return value.endsWith('/') ? value.slice(0, -1) : value;
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

    // Only block non-HTTPS URLs that are not private/local hostnames.
    // Private/local IPs and localhost are always allowed regardless of build type
    // so that local dev servers (e.g. 192.168.x.x:3000) reach the correct host.
    const isPrivate = isPrivateHostname(parsed.hostname);
    const isSecure = parsed.protocol === 'https:';
    if (!isPrivate && !isSecure) {
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

function createTimeoutError(message) {
  const error = new Error(message || 'request_timeout');
  error.name = 'TimeoutError';
  error.code = 'API_REQUEST_TIMEOUT';
  return error;
}

function isTimeoutError(error) {
  return Boolean(
    error &&
    typeof error === 'object' &&
    (error.code === 'API_REQUEST_TIMEOUT' || error.name === 'TimeoutError')
  );
}

async function fetchWithTimeout(input, init, config) {
  const timeoutMs = Number.isFinite(config && config.timeoutMs)
    ? Number(config.timeoutMs)
    : API_REQUEST_TIMEOUT_MS;
  const timeoutMessage = (config && config.timeoutMessage) || 'request_timeout';

  if (timeoutMs <= 0) {
    return fetch(input, init);
  }

  if (typeof AbortController !== 'function') {
    return await Promise.race([
      fetch(input, init),
      new Promise((_, reject) => {
        setTimeout(() => reject(createTimeoutError(timeoutMessage)), timeoutMs);
      }),
    ]);
  }

  const controller = new AbortController();
  const externalSignal = init && init.signal;
  let timedOut = false;
  const nextInit = {
    ...(init || {}),
    signal: controller.signal,
  };

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else if (typeof externalSignal.addEventListener === 'function') {
      externalSignal.addEventListener('abort', () => controller.abort(), { once: true });
    }
  }

  const timerId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(input, nextInit);
  } catch (error) {
    if (timedOut) {
      throw createTimeoutError(timeoutMessage);
    }
    throw error;
  } finally {
    clearTimeout(timerId);
  }
}

/**
 * Fetch wrapper that injects auth headers and resolves the API base URL.
 * Equivalent to the mobile `apiFetch` helper.
 */
async function apiFetch(path, options, session) {
  const timeoutMs = options && typeof options.timeoutMs === 'number' ? options.timeoutMs : undefined;
  const timeoutMessage = options && typeof options.timeoutMessage === 'string' ? options.timeoutMessage : undefined;
  const nextOptions = options ? { ...options } : {};
  delete nextOptions.timeoutMs;
  delete nextOptions.timeoutMessage;

  const headers = buildAuthHeaders(session || null, (options || {}).headers);
  return fetchWithTimeout(`${getApiBase()}${path}`, { ...nextOptions, headers }, { timeoutMs, timeoutMessage });
}

module.exports = {
  API_REQUEST_TIMEOUT_MS,
  DEFAULT_API_BASE,
  getApiBase,
  buildAuthHeaders,
  createTimeoutError,
  isTimeoutError,
  fetchWithTimeout,
  apiFetch,
};
