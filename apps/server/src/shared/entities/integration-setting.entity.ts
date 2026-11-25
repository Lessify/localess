import type { integrationSettings } from '../../infra/database/schema.js';
import type { UserSelect } from './user.entity.js';

/** An integration connected in the UI. An `integration_settings` row; `secrets` is sealed, never sent to the web. */
export type IntegrationSettingEntity = typeof integrationSettings.$inferSelect;
/** An `integration_settings` row to insert (defaults left out). */
export type IntegrationSettingInsertEntity = typeof integrationSettings.$inferInsert;

/** The row with its relations (`infra/database/relations.ts`), each present when the query asked for it (`with`). */
export type IntegrationSettingSelect = IntegrationSettingEntity & {
  updatedByUser?: UserSelect | null;
};
