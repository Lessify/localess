import { Router } from 'express';
import { FieldValue, UpdateData, WithFieldValue } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/https';
import { logger } from 'firebase-functions/v2';
import { firestoreService } from '../config';
import { Space, TokenPermission, Translation, TranslationType, zTranslationUpdateSchema } from '../models';
import { findSpaceById, findTranslationById } from '../services';
import { RequestWithToken, requireTokenPermissions } from './middleware/api-key-auth.middleware';

// eslint-disable-next-line new-cap
export const MANAGE = Router();

MANAGE.post(
  '/api/v1/spaces/:spaceId/translations/:locale',
  requireTokenPermissions([TokenPermission.DEV_TOOLS]),
  async (req: RequestWithToken, res) => {
    logger.info('v1 spaces translations update params : ' + JSON.stringify(req.params));
    // req.token contains the validated token object
    // req.tokenId contains the token string
    const { spaceId, locale } = req.params;
    const body = zTranslationUpdateSchema.safeParse(req.body);
    if (body.success) {
      const spaceSnapshot = await findSpaceById(spaceId).get();
      const space = spaceSnapshot.data() as Space;
      if (!space.locales.some(it => it.id === locale)) {
        res
          .status(400)
          .send(new HttpsError('invalid-argument', 'Locale not supported by this space', `Locale ${locale} is not in space locales`));
        return;
      }
      if (body.data.type === 'add-missing') {
        // Handle adding missing translations
        const fetchPromises = Object.getOwnPropertyNames(body.data.values).map(id => findTranslationById(spaceId, id).get());
        const snapshots = await Promise.all(fetchPromises);
        const translationIds = snapshots.filter(it => !it.exists).map(it => it.id);
        if (translationIds.length === 0) {
          res.status(200).send({ message: 'No missing translations to add' });
          return;
        }
        // Now `missing` contains the IDs of translations that are missing and can be added
        const bulk = firestoreService.bulkWriter();
        translationIds.forEach(id => {
          const ref = firestoreService.collection(`spaces/${spaceId}/translations`).doc(id);
          const data: WithFieldValue<Translation> = {
            type: TranslationType.STRING,
            locales: {
              [locale]: body.data.values[id],
            },
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          };
          bulk.create(ref, data);
        });
        await bulk.close();
        res.status(200).send({ message: `Added ${translationIds.length} missing translations`, addedIds: translationIds });
        return;
      } else if (body.data.type === 'update-existing') {
        // Handle updating existing translations
        const fetchPromises = Object.getOwnPropertyNames(body.data.values).map(id => findTranslationById(spaceId, id).get());
        const snapshots = await Promise.all(fetchPromises);
        const translationIds = snapshots.filter(it => it.exists).map(it => it.id);
        if (translationIds.length === 0) {
          res.status(200).send({ message: 'No translations to update' });
          return;
        }
        // Now `missing` contains the IDs of translations that are missing and can be added
        const bulk = firestoreService.bulkWriter();
        translationIds.forEach(id => {
          const ref = firestoreService.doc(`spaces/${spaceId}/translations/${id}`);
          const data: UpdateData<Translation> = {
            updatedAt: FieldValue.serverTimestamp(),
          };
          data[`locales.${locale}`] = body.data.values[id];
          bulk.update(ref, data);
        });
        await bulk.close();
        res.status(200).send({ message: `Updated ${translationIds.length} translations`, addedIds: translationIds });
        return;
      }
    }
    res.status(400).send(new HttpsError('invalid-argument', 'Bad request body', body.error));
  }
);
