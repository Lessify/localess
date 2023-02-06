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
  PublishContentData,
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
        id: contentSnapshot.id,
        name: content.name,
        slug: content.slug,
        fullSlug: content.fullSlug,
        parentSlug: content.parentSlug,
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
export const onContentUpdate = firestore.document('spaces/{spaceId}/contents/{contentId}')
  .onUpdate(async (change, context) => {
    logger.info(`[Content::onUpdate] eventId='${context.eventId}' id='${change.before.id}'`);
    const contentBefore = change.before.data() as Content;
    const contentAfter = change.after.data() as Content;
    logger.info(`[Content::onUpdate] eventId='${context.eventId}' id='${change.before.id}' slug before='${contentBefore.fullSlug}' after='${contentAfter.fullSlug}'`);
    // First level check, check if the slug is different
    if (contentBefore.fullSlug === contentAfter.fullSlug) {
      logger.info(`[Content::onUpdate] eventId='${context.eventId}' id='${change.before.id}' has no changes in fullSlug`);
    } else {
      // In case it is a PAGE, skip recursion as PAGE doesn't have child
      if (contentAfter.kind === ContentKind.PAGE) return;
      // cascade changes to all child's in case it is a FOLDER
      // It will create recursion
      const batch = firestoreService.batch()
      const contentsSnapshot = await firestoreService
        .collection(`spaces/${context.params['spaceId']}/contents`)
        .where('parentSlug', '==', contentBefore.fullSlug)
        .get()
      contentsSnapshot.docs.filter((it) => it.exists)
        .forEach((it) => {
          const content = it.data() as Content;
          const update = {
            parentSlug: contentAfter.fullSlug,
            fullSlug: `${contentAfter.fullSlug}/${content.slug}`
          }
          batch.update(it.ref, update)
        })
      return batch.commit()
    }
    return;
  });
export const onContentDelete = firestore.document('spaces/{spaceId}/contents/{contentId}')
  .onDelete(async (snapshot: QueryDocumentSnapshot, context: EventContext) => {
    logger.info(`[Content::onDelete] eventId='${context.eventId}' id='${snapshot.id}'`);
    const content = snapshot.data() as Content;
    logger.info(`[Content::onDelete] eventId='${context.eventId}' id='${snapshot.id}' fullSlug='${content.fullSlug}'`);
    if (content.kind === ContentKind.PAGE) {
      return bucket.deleteFiles({
        prefix: `spaces/${context.params['spaceId']}/contents/${context.params['contentId']}`,
      });
    } else if (content.kind === ContentKind.FOLDER) {
      // cascade changes to all child's in case it is a FOLDER
      // It will create recursion
      const batch = firestoreService.batch()
      const contentsSnapshot = await firestoreService
        .collection(`spaces/${context.params['spaceId']}/contents`)
        .where('parentSlug', '==', content.fullSlug)
        .get()
      contentsSnapshot.docs
        .filter((it) => it.exists)
        .forEach((it) => batch.delete(it.ref))
      return batch.commit()
    }
    return;
  });
