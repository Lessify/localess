import { z } from 'zod';

import { TokenType } from './token.model.js';

// App API requests of API tokens.

/** `POST /api/app/spaces/:spaceId/tokens`. */
export const zTokenCreate = z
  .object({
    name: z.string().trim().min(1).max(200),
    type: z.enum(TokenType),
    cacheTtl: z.number().int().min(0).max(31_536_000).nullish(),
  })
  .strict();
export type TokenCreate = z.infer<typeof zTokenCreate>;

/** `PUT /api/app/spaces/:spaceId/tokens/:id`. The type can't change: a `type` key is a 400. */
export const zTokenUpdate = zTokenCreate.omit({ type: true }).strict();
export type TokenUpdate = z.infer<typeof zTokenUpdate>;
