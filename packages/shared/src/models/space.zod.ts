import { z } from 'zod';
import { zBoolean, zPreviewUrl } from './common.zod.js';
import { zPageable, zSearch } from './page.zod.js';
import { SPACE_ENVIRONMENT_SORT_FIELDS, SPACE_LOCALE_SORT_FIELDS, SPACE_SORT_FIELDS, SPACE_TEMPLATE_IDS } from './space.model.js';

// App API requests of spaces, their environments and their locales. Bodies are strict (an unknown field is a 400 that
// names it); queries are not (a link may carry parameters of its own).

const zName = z.string().trim().min(1).max(200);

/** `POST /api/app/spaces`. */
export const zSpaceCreate = z.strictObject({ name: zName, template: z.enum(SPACE_TEMPLATE_IDS).optional() });
export type SpaceCreate = z.infer<typeof zSpaceCreate>;

/** `PATCH /api/app/spaces/:spaceId`: the name only; the default locale has its own route (`zSpaceDefaultLocaleUpdate`). */
export const zSpaceUpdate = z.strictObject({ name: zName });
export type SpaceUpdate = z.infer<typeof zSpaceUpdate>;

/**
 * `GET /api/app/spaces`: one page, `?search=` (name, or the id), `?importing=false` (leave out spaces whose import from
 * Firebase runs or failed: they can not be opened).
 */
export const zSpacePageable = zPageable(SPACE_SORT_FIELDS, 'name').extend({
  search: zSearch,
  importing: zBoolean.optional(),
});
export type SpacePageable = z.infer<typeof zSpacePageable>;

const zEnvironment = z.strictObject({ name: z.string().trim().min(1).max(200), url: zPreviewUrl });

/** `GET …/environments`: one page, in the space's order unless sorted otherwise; `?search=` (the name or the URL). */
export const zSpaceEnvironmentPageable = zPageable(SPACE_ENVIRONMENT_SORT_FIELDS, 'position').extend({
  search: zSearch,
});
export type SpaceEnvironmentPageable = z.infer<typeof zSpaceEnvironmentPageable>;

/** `POST …/environments`: at the end of the space's list. */
export const zSpaceEnvironmentCreate = zEnvironment;
export type SpaceEnvironmentCreate = z.infer<typeof zSpaceEnvironmentCreate>;

/** `PUT …/environments/:environmentId`: the whole environment, name and URL. */
export const zSpaceEnvironmentUpdate = zEnvironment;
export type SpaceEnvironmentUpdate = z.infer<typeof zSpaceEnvironmentUpdate>;

/** `PUT …/environments/order`: every environment's id, in the new order. */
export const zSpaceEnvironmentOrder = z.strictObject({ ids: z.array(z.uuid()).min(1).max(1000) });
export type SpaceEnvironmentOrder = z.infer<typeof zSpaceEnvironmentOrder>;

const zLocaleId = z.string().min(1).max(64);

/** `GET …/locales`: one page, in the space's order unless sorted otherwise; `?search=` (the locale's id or name). */
export const zSpaceLocalePageable = zPageable(SPACE_LOCALE_SORT_FIELDS, 'position').extend({
  search: zSearch,
});
export type SpaceLocalePageable = z.infer<typeof zSpaceLocalePageable>;

/** `POST …/locales`: a locale of the catalog, added at the end of the space's list. */
export const zSpaceLocaleCreate = z.strictObject({ localeId: zLocaleId });
export type SpaceLocaleCreate = z.infer<typeof zSpaceLocaleCreate>;

/** `PUT …/locales/order`: every locale's id, in the new order. */
export const zSpaceLocaleOrder = z.strictObject({ ids: z.array(zLocaleId).min(1).max(1000) });
export type SpaceLocaleOrder = z.infer<typeof zSpaceLocaleOrder>;

/** `PUT /api/app/spaces/:spaceId/default-locale`: one of the space's locales. */
export const zSpaceDefaultLocaleUpdate = z.strictObject({ defaultLocaleId: zLocaleId });
export type SpaceDefaultLocaleUpdate = z.infer<typeof zSpaceDefaultLocaleUpdate>;
