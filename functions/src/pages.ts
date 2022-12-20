import {https, logger} from 'firebase-functions';
import {SecurityUtils} from './utils/security-utils';
import {bucket, firestoreService} from './config';
import {Space} from './models/space.model';
import axios from 'axios';
import {Page, PageStorage, PublishPageData} from './models/page.model';
import {Schematic} from './models/schematic.model';
import {FieldValue} from 'firebase-admin/firestore';
import {UserPermission} from './models/user.model';

// Publish
export const pagePublish = https.onCall(async (data: PublishPageData, context) => {
  logger.info('[pagesPublish] data: ' + JSON.stringify(data));
  logger.info('[pagesPublish] context.auth: ' + JSON.stringify(context.auth));
  if (!SecurityUtils.canPerform(UserPermission.CONTENT_PUBLISH, context.auth)) throw new https.HttpsError('permission-denied', 'permission-denied');
  const spaceSnapshot = await firestoreService.doc(`spaces/${data.spaceId}`).get();
  const pageSnapshot = await firestoreService.doc(`spaces/${data.spaceId}/pages/${data.pageId}`).get();
  const schematicsSnapshot = await firestoreService.collection(`spaces/${data.spaceId}/schematics`).get();
  if (spaceSnapshot.exists && pageSnapshot.exists) {
    const space: Space = spaceSnapshot.data() as Space;
    const page: Page = pageSnapshot.data() as Page;
    const schematics = schematicsSnapshot.docs.filter((it) => it.exists).map((it) => it.data() as Schematic);

    for (const locale of space.locales) {
      const pageStorage: PageStorage = {
        id: page.id,
        name: page.name,
        slug: page.slug,
        schematic: page.schematic,
        createdAt: page.createdAt.toDate().toISOString(),
        updatedAt: page.updatedAt.toDate().toISOString(),
        publishedAt: new Date().toISOString(),
      };

      if (page.content) {
        pageStorage.content = {
          _id: page.content._id,
          schematic: page.content.schematic,
        };
        const schematic = schematics.find((it) => it.name == page.content?.schematic);
        for (const component of schematic?.components || []) {
          if (component.translatable) {
            let value = page.content[`${component.name}_i18n_${locale.id}`];
            if (!value) {
              value = page.content[`${component.name}_i18n_${space.localeFallback.id}`];
            }
            pageStorage.content[component.name] = value;
          } else {
            pageStorage.content[component.name] = page.content[component.name];
          }
        }
      }

      // Save generated JSON
      logger.info(`[pagesPublish] Save file to spaces/${data.spaceId}/pages/${data.pageId}/${locale.id}.json`);
      bucket.file(`spaces/${data.spaceId}/pages/${data.pageId}/${locale.id}.json`)
        .save(
          JSON.stringify(pageStorage),
          (err?: Error | null) => {
            if (err) {
              logger.error(`[pagesPublish] Can not save file for Space(${data.spaceId}), Page(${data.pageId}) and Locale(${locale})`);
              logger.error(err);
            }
          }
        );
      const origin = context.rawRequest.header('origin');
      if (origin && !origin.includes('//localhost:')) {
        const url = `/api/v1/spaces/${data.spaceId}/pages/${data.pageId}/${locale.id}.json`;
        await axios.request({
          baseURL: origin,
          url: url,
          method: 'PURGE',
        });
        logger.info(`[pagesPublish] purge url ${origin}${url}`);
      }
    }
    await pageSnapshot.ref.update({publishedAt: FieldValue.serverTimestamp()});
    return;
  } else {
    logger.info(`[pagesPublish] Page ${data.pageId} does not exist.`);
    throw new https.HttpsError('not-found', 'Page not found');
  }
});
