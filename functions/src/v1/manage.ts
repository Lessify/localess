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
    if (body.success) {
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
      if (type === 'add-missing') {
        // Handle adding missing translations
        const fetchPromises = Object.getOwnPropertyNames(values).map(id => findTranslationById(spaceId, id).get());
        const snapshots = await Promise.all(fetchPromises);
        const translationIds = snapshots.filter(it => !it.exists).map(it => it.id);
        if (translationIds.length === 0) {
          logger.info('[V1:Translations:update] No missing translations to add');
          res.status(200).send({ message: 'No missing translations to add' });
          return;
        }
        if (dryRun) {
          logger.info(`[V1:Translations:update] [DryRun] Would add ${translationIds.length} missing translations`, translationIds);
          res.status(200).send({
            message: `[V1:Translations:update] [DryRun] Would add ${translationIds.length} missing translations`,
            ids: translationIds,
            dryRun: true,
          });
          return;
        }
        // Now `missing` contains the IDs of translations that are missing and can be added
        await commitInBatches(
          translationIds.map(id => findTranslationById(spaceId, id)),
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
        await generateTranslationsDraft(spaceId, space);
        logger.info(`[V1:Translations:update] Added ${translationIds.length} missing translations`, translationIds);
        res.status(200).send({ message: `Added ${translationIds.length} missing translations`, ids: translationIds });
        return;
      } else if (type === 'update-existing') {
        // Handle updating existing translations
        const fetchPromises = Object.getOwnPropertyNames(values).map(id => findTranslationById(spaceId, id).get());
        const snapshots = await Promise.all(fetchPromises);
        const translationIds = snapshots.filter(it => it.exists).map(it => it.id);
        if (translationIds.length === 0) {
          logger.info('[V1:Translations:update] No translations to update');
          res.status(200).send({ message: 'No translations to update' });
          return;
        }
        if (dryRun) {
          logger.info(`[V1:Translations:update] [DryRun] Would update ${translationIds.length} translations`, translationIds);
          res.status(200).send({
            message: `[V1:Translations:update] [DryRun] Would update ${translationIds.length} translations`,
            ids: translationIds,
            dryRun: true,
          });
          return;
        }
        // Now `missing` contains the IDs of translations that are missing and can be added
        await commitInBatches(
          translationIds.map(id => findTranslationById(spaceId, id)),
          (batch, ref) => {
            const data: UpdateData<Translation> = {
              updatedAt: FieldValue.serverTimestamp(),
            };
            data[`locales.${locale}`] = values[ref.id];
            batch.update(ref, data);
          }
        );
        await generateTranslationsDraft(spaceId, space);
        logger.info(`[V1:Translations:update] Updated ${translationIds.length} translations`, translationIds);
        res.status(200).send({ message: `Updated ${translationIds.length} translations`, ids: translationIds });
        return;
      } else if (type === 'delete-missing') {
        // Handle deleting missing translations
        const translationsSnapshot = await findTranslations(spaceId).get();
        const translationIds = translationsSnapshot.docs.filter(it => values[it.id] === undefined).map(it => it.id);
        if (translationIds.length === 0) {
          logger.info('[V1:Translations:update] No translations to delete');
          res.status(200).send({ message: 'No translations to delete' });
          return;
        }
        if (dryRun) {
          logger.info(`[V1:Translations:update] [DryRun] Would delete ${translationIds.length} missing translations`, translationIds);
          res.status(200).send({
            message: `[V1:Translations:update] [DryRun] Would delete ${translationIds.length} missing translations`,
            ids: translationIds,
            dryRun: true,
          });
          return;
        }
        await commitInBatches(
          translationIds.map(id => findTranslationById(spaceId, id)),
          (batch, ref) => batch.delete(ref)
        );
        await generateTranslationsDraft(spaceId, space);
        logger.info(`[V1:Translations:update] Delete ${translationIds.length} missing translations`, translationIds);
        res.status(200).send({ message: `Added ${translationIds.length} missing translations`, ids: translationIds });
        return;
      }
    }
    logger.error('[V1:Translations:update] Bad request body', body.error);
    res.status(400).send(new HttpsError('invalid-argument', 'Bad request body', body.error));
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
