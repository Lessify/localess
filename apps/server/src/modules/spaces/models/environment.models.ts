import { z } from 'zod';
import type { SpaceEnvironmentInput } from '@localess/shared';
import { zPreviewUrl } from '../../../infra/http/zod.js';

/** Creating or editing an environment (`POST`, `PATCH …/environments`). */
export const zSpaceEnvironmentInput = z.object({
  name: z.string().trim().min(1).max(200),
  url: zPreviewUrl,
}) satisfies z.ZodType<SpaceEnvironmentInput>;

/** `PUT …/environments/order`: every environment's id, in the new order. */
export const zEnvironmentOrder = z.object({ ids: z.array(z.uuid()).min(1).max(1000) });
export type EnvironmentOrder = z.infer<typeof zEnvironmentOrder>;
