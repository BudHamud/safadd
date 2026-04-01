import { isTimeoutError } from './api';

export function getRequestErrorMessage(error: unknown, fallback: string, lang: 'en' | 'es' = 'es') {
  if (isTimeoutError(error)) {
    return lang === 'en'
      ? 'The server took too long to respond. Please try again. The issue was reported.'
      : 'El servidor tardó demasiado en responder. Proba de nuevo. El error fue reportado.';
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  return fallback;
}