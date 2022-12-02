import {https, logger} from 'firebase-functions';
import {SecurityUtils} from './utils/security-utils';
import {bucket, firestoreService, ROLE_ADMIN, ROLE_EDIT, ROLE_WRITE} from './config';
import {Space} from './models/space.model';
import axios from 'axios';
import {Page, PublishPageData} from './models/pages.model';
import {Schematic} from './models/schematic.model';

// Publish
export const pagePublish = https.onCall(async (data: PublishPageData, context) => {
  logger.info('[pagesPublish] data: ' + JSON.stringify(data));
  logger.info('[pagesPublish] context.auth: ' + JSON.stringify(context.auth));
  if (!SecurityUtils.hasAnyRole([ROLE_EDIT, ROLE_WRITE, ROLE_ADMIN], context.auth)) throw new https.HttpsError('permission-denied', 'permission-denied');
  const spaceSnapshot = await firestoreService.doc(`spaces/${data.spaceId}`).get();
  const pageSnapshot = await firestoreService.doc(`spaces/${data.spaceId}/pages/${data.pageId}`).get();
  const schematicsSnapshot = await firestoreService.collection(`spaces/${data.spaceId}/schematics`).get();
  if (spaceSnapshot.exists && pageSnapshot.exists) {
    const space: Space = spaceSnapshot.data() as Space;
    const page: Page = pageSnapshot.data() as Page;
    const schematics = schematicsSnapshot.docs.filter((it) => it.exists).map((it) => it.data() as Schematic);

    for (const locale of space.locales) {
      schematics.length
      const localeJson: Record<string, any> = {};

      localeJson['id'] = page.id
      localeJson['name'] = page.name
      localeJson['slug'] = page.slug
      localeJson['createdAt'] = page.createdAt.valueOf()
      localeJson['updatedAt'] = page.updatedAt.valueOf()

      if (page.content) {
        localeJson['content'] = {}
        localeJson['content']._id = page.content._id
        localeJson['content'].schematic = page.content.schematic
        const schematic = schematics.find(it => it.name == page.content?.schematic)
        for (const component of schematic?.components || []) {
          if (component.translatable) {
            localeJson['content'][component.name] = page.content[`${component.name}_i18n_${locale.id}`]
          } else {
            localeJson['content'][component.name] = page.content[component.name]
          }
        }
      }

      // Save generated JSON
      logger.info(`[pagesPublish] Save file to spaces/${data.spaceId}/pages/${data.pageId}/${locale.id}.json`);
      bucket.file(`spaces/${data.spaceId}/pages/${data.pageId}/${locale.id}.json`)
        .save(
          JSON.stringify(localeJson),
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
    return;
  } else {
    logger.info(`[pagesPublish] Page ${data.pageId} does not exist.`);
    throw new https.HttpsError('not-found', 'Page not found');
  }
});
