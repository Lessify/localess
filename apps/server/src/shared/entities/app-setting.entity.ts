import type { appSettings } from '../../infra/database/schema.js';

/** An install-wide setting that isn't secret. An `app_settings` row. */
export type AppSettingEntity = typeof appSettings.$inferSelect;
/** An `app_settings` row to insert (defaults left out). */
export type AppSettingInsertEntity = typeof appSettings.$inferInsert;

/** The row; it has no relations. */
export type AppSettingSelect = AppSettingEntity;
