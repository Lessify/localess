import { z } from 'zod';

/** A locale of the space by its id (`POST …/locales`, `PUT …/default-locale`). */
export const zLocaleId = z.object({ id: z.string().min(1).max(64) });
export type LocaleId = z.infer<typeof zLocaleId>;

/** `PUT …/locales/order`: every locale's id, in the new order. */
export const zLocaleOrder = z.object({ ids: z.array(z.string().min(1).max(64)).min(1).max(1000) });
export type LocaleOrder = z.infer<typeof zLocaleOrder>;
