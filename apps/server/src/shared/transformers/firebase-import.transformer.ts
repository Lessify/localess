import type { FirebaseImport } from '@localess/shared';
import type { FirebaseImportEntity } from '../entities/firebase-import.entity.js';

/**
 * A `firebase_imports` run as the App API's DTO: unset columns left out, the heartbeat dropped, the error of a failed
 * run taken from its FAILED stage.
 */
export const toFirebaseImport = (entity: FirebaseImportEntity): FirebaseImport => {
  const failed = entity.stages.find(it => it.status === 'FAILED');
  return {
    id: entity.id,
    origin: entity.origin,
    sourceSpaceId: entity.sourceSpaceId,
    sourceSpaceName: entity.sourceSpaceName,
    ...(entity.spaceId ? { spaceId: entity.spaceId } : {}),
    status: entity.status as FirebaseImport['status'],
    stages: entity.stages,
    ...(failed ? { error: { stage: failed.stage, message: failed.error ?? '' } } : {}),
    startedBy: entity.startedBy,
    startedAt: entity.startedAt.toISOString(),
    ...(entity.finishedAt ? { finishedAt: entity.finishedAt.toISOString() } : {}),
  };
};
