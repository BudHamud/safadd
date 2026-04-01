import {
	API_REQUEST_TIMEOUT_MS,
	DEFAULT_API_BASE,
	buildAuthHeaders,
	fetchWithTimeout,
	getApiBase,
	isTimeoutError,
	apiFetch as sharedApiFetch,
} from '@safed/shared/api';
import { reportClientError } from './clientErrorReporter';

type ApiFetchOptions = RequestInit & {
	timeoutMs?: number;
	timeoutMessage?: string;
};

type SessionLike = {
	access_token?: string;
	user?: {
		email?: string | null;
	} | null;
} | null;

export { API_REQUEST_TIMEOUT_MS, DEFAULT_API_BASE, getApiBase, buildAuthHeaders, fetchWithTimeout, isTimeoutError };

export async function apiFetch(path: string, options?: ApiFetchOptions, session?: SessionLike) {
	try {
		return await sharedApiFetch(path, options, session);
	} catch (error) {
		if (isTimeoutError(error)) {
			await reportClientError(error, {
				context: 'api_fetch_timeout',
				userEmail: session?.user?.email ?? undefined,
				metadata: {
					method: options?.method ?? 'GET',
					path,
				},
			});
		}

		throw error;
	}
}
