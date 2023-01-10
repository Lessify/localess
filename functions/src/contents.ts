import {EventContext, firestore, https, logger} from 'firebase-functions';
import {SecurityUtils} from './utils/security-utils';
import {bucket, firestoreService} from './config';
import {Space} from './models/space.model';
import axios from 'axios';
import {
  Content,
  ContentKind,
  ContentPage,
  ContentPageStorage,
  PublishContentData
} from './models/content.model';
import {Schematic} from './models/schematic.model';
import {FieldValue, QueryDocumentSnapshot} from 'firebase-admin/firestore';
import {UserPermission} from './models/user.model';

// Publish
export const contentPublish = https.onCall(async (data: PublishContentData, context) => {
  logger.info('[contentPublish] data: ' + JSON.stringify(data));
  logger.info('[contentPublish] context.auth: ' + JSON.stringify(context.auth));
  if (!SecurityUtils.canPerform(UserPermission.CONTENT_PUBLISH, context.auth)) throw new https.HttpsError('permission-denied', 'permission-denied');
  const spaceSnapshot = await firestoreService.doc(`spaces/${data.spaceId}`).get();
  const contentSnapshot = await firestoreService.doc(`spaces/${data.spaceId}/contents/${data.contentId}`).get();
  const schematicsSnapshot = await firestoreService.collection(`spaces/${data.spaceId}/schematics`).get();
  if (spaceSnapshot.exists && contentSnapshot.exists) {
    const space: Space = spaceSnapshot.data() as Space;
    const content: ContentPage = contentSnapshot.data() as ContentPage;
    const schematics = schematicsSnapshot.docs.filter((it) => it.exists).map((it) => it.data() as Schematic);

    for (const locale of space.locales) {
      const pageStorage: ContentPageStorage = {
        id: content.id,
        name: content.name,
        slug: content.slug,
        fullSlug: content.fullSlug,
        parentSlug: content.parentSlug,
        schematic: content.schematic,
        createdAt: content.createdAt.toDate().toISOString(),
        updatedAt: content.updatedAt.toDate().toISOString(),
        publishedAt: new Date().toISOString(),
      };

      if (content.data) {
        pageStorage.data = {
          _id: content.data._id,
          schematic: content.data.schematic,
        };
        const schematic = schematics.find((it) => it.name == content.data?.schematic);
        for (const component of schematic?.components || []) {
          if (component.translatable) {
            let value = content.data[`${component.name}_i18n_${locale.id}`];
            if (!value) {
              value = content.data[`${component.name}_i18n_${space.localeFallback.id}`];
            }
            pageStorage.data[component.name] = value;
          } else {
            pageStorage.data[component.name] = content.data[component.name];
          }
        }
      }

      // Save generated JSON
      logger.info(`[contentPublish] Save file to spaces/${data.spaceId}/contents/${data.contentId}/${locale.id}.json`);
      bucket.file(`spaces/${data.spaceId}/contents/${data.contentId}/${locale.id}.json`)
        .save(
          JSON.stringify(pageStorage),
          (err?: Error | null) => {
            if (err) {
              logger.error(`[contentPublish] Can not save file for Space(${data.spaceId}), Content(${data.contentId}) and Locale(${locale})`);
              logger.error(err);
            }
          }
        );
      const origin = context.rawRequest.header('origin');
      if (origin && !origin.includes('//localhost:')) {
        const url = `/api/v1/spaces/${data.spaceId}/contents/${data.contentId}/${locale.id}`;
        await axios.request({
          baseURL: origin,
          url: url,
          method: 'PURGE',
        });
        logger.info(`[contentPublish] purge url ${origin}${url}`);
      }
    }
    await contentSnapshot.ref.update({publishedAt: FieldValue.serverTimestamp()});
    return;
  } else {
    logger.info(`[contentPublish] Content ${data.contentId} does not exist.`);
    throw new https.HttpsError('not-found', 'Content not found');
  }
});

// Firestore events
export const onContentDelete = firestore.document('spaces/{spaceId}/contents/{contentId}')
  .onDelete(async (snapshot: QueryDocumentSnapshot, context: EventContext) => {
    logger.info(`[Content::onDelete] id='${snapshot.id}' exists=${snapshot.exists} eventId='${context.eventId}'`);
    const content = snapshot.data() as Content;
    if (content.kind === ContentKind.PAGE) {
      return bucket.deleteFiles({
        prefix: `spaces/${context.params['spaceId']}/contents/${context.params['contentId']}`,
      });
    }
    return;
  });
