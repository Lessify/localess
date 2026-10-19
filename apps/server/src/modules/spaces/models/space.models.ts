import { z } from 'zod';
import { SPACE_TEMPLATE_IDS, type SpaceCreate, type SpaceUpdate } from '@localess/shared';
import { zPageable } from '@localess/shared/zod';

const zName = z.string().trim().min(1).max(200);

/** `POST /api/app/spaces`. */
export const zSpaceCreate = z.object({ name: zName, template: z.enum(SPACE_TEMPLATE_IDS).optional() }) satisfies z.ZodType<SpaceCreate>;

/** `PATCH /api/app/spaces/:spaceId`. */
export const zSpaceUpdate = z.object({ name: zName }).strict() satisfies z.ZodType<SpaceUpdate>;

/** The fields Admin → Spaces may sort by (`name`: case-insensitive). */
export const SPACE_SORT_FIELDS = ['name', 'id', 'updatedAt'] as const;
export type SpaceSortField = (typeof SPACE_SORT_FIELDS)[number];

/**
 * `GET /api/app/spaces`: one page, `?search=` (name, or the id), `?importing=false` (leave out spaces whose import from
 * Firebase runs or failed: they can not be opened).
 */
export const zSpacePageable = zPageable(SPACE_SORT_FIELDS, 'name').extend({
  search: z.string().trim().max(200).optional(),
  importing: z
    .enum(['true', 'false'])
    .transform(it => it === 'true')
    .optional(),
});
export type SpacePageable = z.infer<typeof zSpacePageable>;
