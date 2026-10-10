import { HttpErrorResponse } from '@angular/common/http';

/**
 * The notification for one failed upload. A 413 can come from the server (`LOCALESS_UPLOAD_MAX_MB`) or from
 * a reverse proxy in front of it (nginx answers 413 above 1 MB by default), so it is named whatever the body.
 */
export function uploadErrorMessage(name: string, error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 413) return `${name} could not be uploaded: the file is too large.`;
    const message: unknown = error.error?.message;
    if (typeof message === 'string' && message) return `${name} could not be uploaded: ${message}`;
  }
  return `${name} could not be uploaded.`;
}
