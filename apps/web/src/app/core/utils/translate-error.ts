import { HttpErrorResponse } from '@angular/common/http';

import { apiErrorMessage } from './api-error';

/** What a 412 from `/api/app/translate*` means: the server has no machine translation provider configured. */
export const TRANSLATE_NOT_CONFIGURED =
  'Translation is not available: Google Translate is not configured on this environment. Ask an administrator to set it up.';

/** The notification for a failed machine translation; `fallback` is the action's own failure message, ending in a period. */
export function translateErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse && error.status === 412) return TRANSLATE_NOT_CONFIGURED;
  return apiErrorMessage(error, fallback);
}
