import { Router } from 'express';
import { FieldValue, UpdateData, WithFieldValue } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/https';
import { logger } from 'firebase-functions/v2';
import { firestoreService } from '../config';
import { Space, TokenPermission, Translation, TranslationType, zTranslationUpdateSchema } from '../models';
import { findSpaceById, findTranslationById, findTranslations } from '../services';
import { RequestWithToken, requireTokenPermissions } from './middleware/api-key-auth.middleware';

// eslint-disable-next-line new-cap
export const MANAGE = Router();

MANAGE.post(
  '/api/v1/spaces/:spaceId/translations/:locale',
  requireTokenPermissions([TokenPermission.DEV_TOOLS]),
  async (req: RequestWithToken, res) => {
    logger.info('v1 spaces translations update params : ' + JSON.stringify(req.params));
    logger.info('v1 spaces translations update body : ' + JSON.stringify(req.body));
    // req.token contains the validated token object
    // req.tokenId contains the token string
    const { spaceId, locale } = req.params;
    const body = zTranslationUpdateSchema.safeParse(req.body);
    if (body.success) {
      const { dryRun, type, values } = body.data;
      const spaceSnapshot = await findSpaceById(spaceId).get();
      const space = spaceSnapshot.data() as Space;
      if (!space.locales.some(it => it.id === locale)) {
        logger.error(`Locale ${locale} is not in space locales`);
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
          logger.info('No missing translations to add');
          res.status(200).send({ message: 'No missing translations to add' });
          return;
        }
        if (dryRun) {
          logger.info(`[DryRun] Would add ${translationIds.length} missing translations`, translationIds);
          res
            .status(200)
            .send({ message: `[DryRun] Would add ${translationIds.length} missing translations`, ids: translationIds, dryRun: true });
          return;
        }
        // Now `missing` contains the IDs of translations that are missing and can be added
        const bulk = firestoreService.bulkWriter();
        translationIds.forEach(id => {
          const ref = findTranslationById(spaceId, id);
          const data: WithFieldValue<Translation> = {
            type: TranslationType.STRING,
            locales: {
              [locale]: values[id],
            },
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          };
          bulk.create(ref, data);
        });
        await bulk.close();
        logger.info(`Added ${translationIds.length} missing translations`, translationIds);
        res.status(200).send({ message: `Added ${translationIds.length} missing translations`, ids: translationIds });
        return;
      } else if (type === 'update-existing') {
        // Handle updating existing translations
        const fetchPromises = Object.getOwnPropertyNames(values).map(id => findTranslationById(spaceId, id).get());
        const snapshots = await Promise.all(fetchPromises);
        const translationIds = snapshots.filter(it => it.exists).map(it => it.id);
        if (translationIds.length === 0) {
          logger.info('No translations to update');
          res.status(200).send({ message: 'No translations to update' });
          return;
        }
        if (dryRun) {
          logger.info(`[DryRun] Would update ${translationIds.length} translations`, translationIds);
          res
            .status(200)
            .send({ message: `[DryRun] Would update ${translationIds.length} translations`, ids: translationIds, dryRun: true });
          return;
        }
        // Now `missing` contains the IDs of translations that are missing and can be added
        const bulk = firestoreService.bulkWriter();
        translationIds.forEach(id => {
          const ref = findTranslationById(spaceId, id);
          const data: UpdateData<Translation> = {
            updatedAt: FieldValue.serverTimestamp(),
          };
          data[`locales.${locale}`] = values[id];
          bulk.update(ref, data);
        });
        await bulk.close();
        logger.info(`Updated ${translationIds.length} translations`, translationIds);
        res.status(200).send({ message: `Updated ${translationIds.length} translations`, ids: translationIds });
        return;
      } else if (type === 'delete-missing') {
        // Handle deleting missing translations
        const translationsSnapshot = await findTranslations(spaceId).get();
        const translationIds = translationsSnapshot.docs.filter(it => values[it.id] === undefined).map(it => it.id);
        if (translationIds.length === 0) {
          logger.info('No translations to delete');
          res.status(200).send({ message: 'No translations to delete' });
          return;
        }
        if (dryRun) {
          logger.info(`[DryRun] Would delete ${translationIds.length} missing translations`, translationIds);
          res
            .status(200)
            .send({ message: `[DryRun] Would delete ${translationIds.length} missing translations`, ids: translationIds, dryRun: true });
          return;
        }
        const bulk = firestoreService.bulkWriter();
        translationIds.forEach(id => {
          const ref = findTranslationById(spaceId, id);
          bulk.delete(ref);
        });
        await bulk.close();
        logger.info(`Delete ${translationIds.length} missing translations`, translationIds);
        res.status(200).send({ message: `Added ${translationIds.length} missing translations`, ids: translationIds });
        return;
      }
    }
    logger.error('Bad request body', body.error);
    res.status(400).send(new HttpsError('invalid-argument', 'Bad request body', body.error));
  }
);
