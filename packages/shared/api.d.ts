export declare const DEFAULT_API_BASE: string;
export declare function getApiBase(): string;
export declare function buildAuthHeaders(
  session: { access_token?: string } | null,
  extraHeaders?: Record<string, string>
): Record<string, string>;
export declare function apiFetch(
  path: string,
  options?: RequestInit,
  session?: { access_token?: string } | null
): Promise<Response>;
