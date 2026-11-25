import { HttpErrorResponse } from '@angular/common/http';

import { apiErrorMessage } from './api-error';

/** What a 412 from `/api/app/translate*` means: no machine translation provider is connected. */
export const TRANSLATE_NOT_CONFIGURED =
  'Machine translation is not set up. Ask an admin to connect DeepL or Google in Admin → Settings → Integrations.';

/** The notification for a failed machine translation; `fallback` is the action's own failure message, ending in a period. */
export function translateErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse && error.status === 412) return TRANSLATE_NOT_CONFIGURED;
  return apiErrorMessage(error, fallback);
}
