export declare const API_REQUEST_TIMEOUT_MS: number;
export declare const DEFAULT_API_BASE: string;
export declare function getApiBase(): string;
export declare function buildAuthHeaders(
  session: { access_token?: string } | null,
  extraHeaders?: Record<string, string>
): Record<string, string>;
export declare function createTimeoutError(message?: string): Error & {
  code: string;
  name: string;
};
export declare function isTimeoutError(error: unknown): boolean;
export interface ApiFetchOptions extends RequestInit {
  timeoutMs?: number;
  timeoutMessage?: string;
}
export declare function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  config?: Pick<ApiFetchOptions, 'timeoutMs' | 'timeoutMessage'>
): Promise<Response>;
export declare function apiFetch(
  path: string,
  options?: ApiFetchOptions,
  session?: { access_token?: string } | null
): Promise<Response>;
