import type { spaces } from '../../infra/database/schema.js';
import type { AssetSelect } from './asset.entity.js';
import type { ContentSelect } from './content.entity.js';
import type { ContentLinkSnapshotSelect } from './content-link-snapshot.entity.js';
import type { FirebaseImportSelect } from './firebase-import.entity.js';
import type { LocaleSelect } from './locale.entity.js';
import type { SchemaSelect } from './schema.entity.js';
import type { SpaceEnvironmentSelect } from './space-environment.entity.js';
import type { SpaceLocaleSelect } from './space-locale.entity.js';
import type { TaskSelect } from './task.entity.js';
import type { TokenSelect } from './token.entity.js';
import type { TranslationSelect } from './translation.entity.js';
import type { TranslationSnapshotSelect } from './translation-snapshot.entity.js';
import type { WebhookSelect } from './webhook.entity.js';

/** A space (its locales and environments: `space-locale`, `space-environment`). A `spaces` row. */
export type SpaceEntity = typeof spaces.$inferSelect;
/** A `spaces` row to insert (defaults left out). */
export type SpaceInsertEntity = typeof spaces.$inferInsert;

/** The row with its relations (`infra/database/relations.ts`), each present when the query asked for it (`with`). */
export type SpaceSelect = SpaceEntity & {
  defaultLocale?: LocaleSelect | null;
  spaceLocales?: SpaceLocaleSelect[] | null;
  environments?: SpaceEnvironmentSelect[] | null;
  contents?: ContentSelect[] | null;
  contentLinkSnapshots?: ContentLinkSnapshotSelect[] | null;
  assets?: AssetSelect[] | null;
  schemas?: SchemaSelect[] | null;
  translations?: TranslationSelect[] | null;
  translationSnapshots?: TranslationSnapshotSelect[] | null;
  tasks?: TaskSelect[] | null;
  tokens?: TokenSelect[] | null;
  webhooks?: WebhookSelect[] | null;
  firebaseImport?: FirebaseImportSelect | null;
};
