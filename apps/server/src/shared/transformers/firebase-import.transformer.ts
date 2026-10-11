import type { FirebaseImport } from '@localess/shared';
import type { firebaseImports } from '../../infra/database/schema.js';

type FirebaseImportEntity = typeof firebaseImports.$inferSelect;

/** A `firebase_imports` run as the App API's DTO: unset columns left out, the heartbeat dropped. */
export const toFirebaseImport = (entity: FirebaseImportEntity): FirebaseImport => ({
  id: entity.id,
  origin: entity.origin,
  sourceSpaceId: entity.sourceSpaceId,
  sourceSpaceName: entity.sourceSpaceName,
  ...(entity.spaceId ? { spaceId: entity.spaceId } : {}),
  status: entity.status as FirebaseImport['status'],
  stages: entity.stages,
  ...(entity.error ? { error: entity.error } : {}),
  startedBy: entity.startedBy,
  startedAt: entity.startedAt.toISOString(),
  ...(entity.finishedAt ? { finishedAt: entity.finishedAt.toISOString() } : {}),
});
