import type { firebaseImports } from '../../infra/database/schema.js';
import type { SpaceSelect } from './space.entity.js';

/** A run of the import of a space from a Firebase install. A `firebase_imports` row. */
export type FirebaseImportEntity = typeof firebaseImports.$inferSelect;
/** A `firebase_imports` row to insert (defaults left out). */
export type FirebaseImportInsertEntity = typeof firebaseImports.$inferInsert;

/** The row with its relations (`infra/database/relations.ts`), each present when the query asked for it (`with`). */
export type FirebaseImportSelect = FirebaseImportEntity & {
  space?: SpaceSelect | null;
};
