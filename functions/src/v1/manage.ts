import { Router } from 'express';
import { DocumentReference, FieldValue, UpdateData, WithFieldValue, WriteBatch } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/https';
import { logger } from 'firebase-functions/v2';
import { BATCH_MAX, firestoreService } from '../config';
import {
  Schema,
  SchemaExport,
  Space,
  TokenPermission,
  Translation,
  TranslationType,
  TranslationUpdateIds,
  zSchemaPushSchema,
  zTranslationUpdateSchema,
} from '../models';
import {
  applySchemaPushPlan,
  findSchemas,
  findSpaceById,
  findTranslationById,
  findTranslations,
  generateTranslationsDraft,
  planSchemaPush,
  planTranslationUpdate,
} from '../services';
import { RequestWithToken, requireTokenPermissions } from './middleware/api-key-auth.middleware';

// eslint-disable-next-line new-cap
export const MANAGE = Router();

/**
 * Apply an operation to a list of document refs in batches of BATCH_MAX, committing as it goes.
 * @param {DocumentReference[]} refs Document references to apply the operation to
 * @param {Function} applyToBatch Callback invoked with the current batch and each ref
 */
async function commitInBatches(
  refs: DocumentReference[],
  applyToBatch: (batch: WriteBatch, ref: DocumentReference) => void
): Promise<void> {
  let batch = firestoreService.batch();
  let count = 0;
  for (const ref of refs) {
    applyToBatch(batch, ref);
    count++;
    if (count === BATCH_MAX) {
      await batch.commit();
      batch = firestoreService.batch();
      count = 0;
    }
  }
  if (count > 0) {
    await batch.commit();
  }
}

/** Per-type verb labels used for log/response messages. */
const TRANSLATION_UPDATE_VERBS: Record<'add-missing' | 'update-existing' | 'delete-missing', { verb: string; past: string }> = {
  'add-missing': { verb: 'add', past: 'Added' },
  'update-existing': { verb: 'update', past: 'Updated' },
  'delete-missing': { verb: 'delete', past: 'Deleted' },
};

MANAGE.post(
  '/api/v1/spaces/:spaceId/translations/:locale',
  requireTokenPermissions([TokenPermission.DEV_TOOLS]),
  async (req: RequestWithToken, res) => {
    logger.info('[V1:Translations:update] params : ' + JSON.stringify(req.params));
    logger.info('[V1:Translations:update] body : ' + JSON.stringify(req.body));
    // req.token contains the validated token object
    // req.tokenId contains the token string
    const { spaceId, locale } = req.params;
    const body = zTranslationUpdateSchema.safeParse(req.body);
    if (!body.success) {
      logger.error('[V1:Translations:update] Bad request body', body.error);
      res.status(400).send(new HttpsError('invalid-argument', 'Bad request body', body.error));
      return;
    }
    const { dryRun, type, values } = body.data;
    const spaceSnapshot = await findSpaceById(spaceId).get();
    const space = spaceSnapshot.data() as Space;
    if (!space.locales.some(it => it.id === locale)) {
      logger.error(`[V1:Translations:update] Locale ${locale} is not in space locales`);
      res
        .status(400)
        .send(new HttpsError('invalid-argument', 'Locale not supported by this space', `Locale ${locale} is not in space locales`));
      return;
    }

    // Fetch strategy matches each type's original cost: add-missing/update-existing only ever
    // need the docs for the ids being pushed (targeted reads); only delete-missing needs to know
    // about every existing id, so only it pays for a full collection scan.
    const existing = new Map<string, Translation>();
    if (type === 'delete-missing') {
      const translationsSnapshot = await findTranslations(spaceId).get();
      translationsSnapshot.docs.forEach(it => existing.set(it.id, it.data() as Translation));
    } else {
      const snapshots = await Promise.all(Object.getOwnPropertyNames(values).map(id => findTranslationById(spaceId, id).get()));
      snapshots.forEach(snapshot => {
        if (snapshot.exists) existing.set(snapshot.id, snapshot.data() as Translation);
      });
    }

    const plan = planTranslationUpdate(existing, locale, values);
    const ids: TranslationUpdateIds = { created: plan.creates, updated: plan.updates, deleted: plan.deletes };
    const counts = {
      created: ids.created.length,
      updated: ids.updated.length,
      deleted: ids.deleted.length,
      unchanged: plan.unchanged.length,
    };
    const actionable = type === 'add-missing' ? plan.creates : type === 'update-existing' ? plan.updates : plan.deletes;
    const { verb, past } = TRANSLATION_UPDATE_VERBS[type];

    if (actionable.length === 0) {
      logger.info(`[V1:Translations:update] No translations to ${verb}`, counts);
      res.status(200).send({ message: `No translations to ${verb}`, counts, ids, dryRun });
      return;
    }

    if (dryRun) {
      logger.info(`[V1:Translations:update] [DryRun] Would ${verb} ${actionable.length} translations`, actionable);
      res.status(200).send({
        message: `[DryRun] Would ${verb} ${actionable.length} translations`,
        counts,
        ids,
        dryRun: true,
      });
      return;
    }

    if (type === 'add-missing') {
      await commitInBatches(
        actionable.map(id => findTranslationById(spaceId, id)),
        (batch, ref) => {
          const data: WithFieldValue<Translation> = {
            type: TranslationType.STRING,
            locales: {
              [locale]: values[ref.id],
            },
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          };
          batch.create(ref, data);
        }
      );
    } else if (type === 'update-existing') {
      await commitInBatches(
        actionable.map(id => findTranslationById(spaceId, id)),
        (batch, ref) => {
          const data: UpdateData<Translation> = {
            updatedAt: FieldValue.serverTimestamp(),
          };
          data[`locales.${locale}`] = values[ref.id];
          batch.update(ref, data);
        }
      );
    } else {
      await commitInBatches(
        actionable.map(id => findTranslationById(spaceId, id)),
        (batch, ref) => batch.delete(ref)
      );
    }
    await generateTranslationsDraft(spaceId, space);
    logger.info(`[V1:Translations:update] ${past} ${actionable.length} translations`, actionable);
    res.status(200).send({ message: `${past} ${actionable.length} translations`, counts, ids });
  }
);

MANAGE.post('/api/v1/spaces/:spaceId/schemas', requireTokenPermissions([TokenPermission.DEV_TOOLS]), async (req: RequestWithToken, res) => {
  // Deliberately not logging the request body: schema payloads carry a whole space's schemas.
  logger.info('[V1:Schemas:push] params : ' + JSON.stringify(req.params));
  const { spaceId } = req.params;
  const body = zSchemaPushSchema.safeParse(req.body);
  if (!body.success) {
    logger.error('[V1:Schemas:push] Bad request body', body.error);
    res.status(400).send(new HttpsError('invalid-argument', 'Bad request body', body.error));
    return;
  }
  const { dryRun, type, schemas } = body.data;
  const spaceSnapshot = await findSpaceById(spaceId).get();
  if (!spaceSnapshot.exists) {
    res.status(404).send(new HttpsError('not-found', 'Not found'));
    return;
  }
  const existing = new Map<string, Schema>();
  const schemasSnapshot = await findSchemas(spaceId).get();
  schemasSnapshot.docs.forEach(it => existing.set(it.id, it.data() as Schema));
  const plan = planSchemaPush(existing, schemas as SchemaExport[], type);
  if (plan.errors.length > 0) {
    logger.error('[V1:Schemas:push] Referential integrity errors', plan.errors);
    res.status(400).send(new HttpsError('failed-precondition', 'Referential integrity check failed', { errors: plan.errors }));
    return;
  }
  const ids = {
    created: plan.creates.map(it => it.id),
    updated: plan.updates.map(it => it.id),
    deleted: plan.deletes,
  };
  const counts = {
    created: ids.created.length,
    updated: ids.updated.length,
    deleted: ids.deleted.length,
    unchanged: plan.unchanged.length,
  };
  if (dryRun) {
    logger.info('[V1:Schemas:push] [DryRun]', counts);
    res.status(200).send({
      message: `[DryRun] Would create ${counts.created}, update ${counts.updated}, delete ${counts.deleted} schemas (${counts.unchanged} unchanged)`,
      counts,
      ids,
      dryRun: true,
    });
    return;
  }
  await applySchemaPushPlan(spaceId, plan);
  logger.info('[V1:Schemas:push] Applied', counts);
  res.status(200).send({
    message: `Created ${counts.created}, updated ${counts.updated}, deleted ${counts.deleted} schemas (${counts.unchanged} unchanged)`,
    counts,
    ids,
  });
});
