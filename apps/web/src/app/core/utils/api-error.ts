import { HttpErrorResponse } from '@angular/common/http';

/** The server's reason for a refused request: NestJS answers `{ message }`, with a list for validation errors. */
export function serverReason(error: unknown): string | undefined {
  if (!(error instanceof HttpErrorResponse)) return undefined;
  const message: unknown = error.error?.message;
  const reason = Array.isArray(message) ? message[0] : message;
  return typeof reason === 'string' && reason ? reason : undefined;
}

/**
 * The notification for a failed action: `fallback` (the action's own message, ending in a period) plus the server's
 * reason when it sent one, e.g. "Document can not be moved: 'blog/home' is already used".
 */
export function apiErrorMessage(error: unknown, fallback: string): string {
  const reason = serverReason(error);
  return reason ? `${fallback.replace(/\.$/, '')}: ${reason}` : fallback;
}
