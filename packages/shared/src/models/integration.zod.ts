import { z } from 'zod';

// App API requests of Admin → Settings → Integrations.

/** A form's values by field key; which keys an integration needs is checked by the server against its definition. */
const zIntegrationValues = z.record(z.string(), z.string().max(65536));

/** `PUT /api/app/admin/integrations/:id`: test, then save. `skipTest` only when the provider couldn't be reached. */
export const zIntegrationSave = z.object({
  values: zIntegrationValues,
  skipTest: z.boolean().optional(),
});
export type IntegrationSave = z.infer<typeof zIntegrationSave>;

/** `POST …/:id/test`: these values without saving them, or the active configuration when absent. */
export const zIntegrationTest = z.object({
  values: zIntegrationValues.optional(),
});
export type IntegrationTest = z.infer<typeof zIntegrationTest>;

/** `PATCH …/:id/enabled`. */
export const zIntegrationEnabledUpdate = z.object({ enabled: z.boolean() });
export type IntegrationEnabledUpdate = z.infer<typeof zIntegrationEnabledUpdate>;

/** `PUT …/translate-primary`. */
export const zTranslatePrimaryUpdate = z.object({ value: z.enum(['deepl', 'google-translate']) });
export type TranslatePrimaryUpdate = z.infer<typeof zTranslatePrimaryUpdate>;
