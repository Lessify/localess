import { logger } from 'firebase-functions';
import { bucket } from '../config';
import { ContentDocumentApi, ContentDocumentStorage } from '../models';

/**
 * Resolve references for a single content document
 * @param {string} spaceId Space identifier
 * @param {ContentDocumentStorage} content Content document
 * @param {string} locale Locale identifier
 * @return {Promise<Record<string, ContentDocumentStorage>>} Map of reference ID to content
 */
export async function resolveReferences(
  spaceId: string,
  content: ContentDocumentStorage,
  locale: string
): Promise<Record<string, ContentDocumentApi>> {
  if (!content.references || content.references.length === 0) {
    return {};
  }

  const resolvedReferences: Record<string, ContentDocumentApi> = {};

  await Promise.all(
    content.references.map(async refId => {
      try {
        const refCachePath = `spaces/${spaceId}/contents/${refId}/${locale}.json`;
        const [exists] = await bucket.file(refCachePath).exists();

        if (exists) {
          const [fileContent] = await bucket.file(refCachePath).download();
          resolvedReferences[refId] = JSON.parse(fileContent.toString());
        } else {
          logger.warn(`[ReferenceResolver::resolveReferences] Reference ${refId} not found at ${refCachePath}`);
        }
      } catch (error) {
        logger.error(`[ReferenceResolver::resolveReferences] Failed to resolve reference ${refId}:`, error);
      }
    })
  );

  return resolvedReferences;
}

/**
 * Resolve references for multiple content documents
 * @param {string} spaceId Space identifier
 * @param {ContentDocumentStorage[]} contents Array of content documents
 * @param {string} locale Locale identifier
 * @return {Promise<Record<string, ContentDocumentStorage>>} Map of reference ID to content
 */
export async function resolveBulkReferences(
  spaceId: string,
  contents: ContentDocumentStorage[],
  locale: string
): Promise<Record<string, ContentDocumentStorage>> {
  const allReferenceIds = new Set<string>();

  contents.forEach(content => {
    content.references?.forEach(refId => allReferenceIds.add(refId));
  });

  if (allReferenceIds.size === 0) {
    return {};
  }

  const resolvedReferences: Record<string, ContentDocumentStorage> = {};

  await Promise.all(
    Array.from(allReferenceIds).map(async refId => {
      try {
        const refCachePath = `spaces/${spaceId}/contents/${refId}/${locale}.json`;
        const [exists] = await bucket.file(refCachePath).exists();

        if (exists) {
          const [fileContent] = await bucket.file(refCachePath).download();
          resolvedReferences[refId] = JSON.parse(fileContent.toString());
        } else {
          logger.warn(`[ReferenceResolver::resolveBulkReferences] Reference ${refId} not found at ${refCachePath}`);
        }
      } catch (error) {
        logger.error(`[ReferenceResolver::resolveBulkReferences] Failed to resolve reference ${refId}:`, error);
      }
    })
  );

  return resolvedReferences;
}
