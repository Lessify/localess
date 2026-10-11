import { Inject, Injectable } from '@nestjs/common';
import { newUuid } from '../../../infra/database/id.js';
import { STORAGE_DRIVER, type StorageDriver } from '../../../infra/storage/storage.driver.js';
import { AssetMetadataService } from '../../../shared/services/asset-metadata.service.js';
import { AssetImportRepository } from '../repositories/asset-import.repository.js';
import type { FirebaseDoc } from '../utils/firebase-client.js';
import { obj, str, timestamps } from '../utils/firebase-docs.js';
import { type ImportStage, StageFailure } from '../utils/firebase-import.utils.js';

/** Stage 8: the assets: ids first, so folder paths can be mapped; then rows and files. */
@Injectable()
export class AssetImportService {
  constructor(
    private readonly assets: AssetImportRepository,
    @Inject(STORAGE_DRIVER) private readonly storage: StorageDriver,
    private readonly metadata: AssetMetadataService,
  ) {}

  /** Answers the count and the Firebase id → new id map, for the reference rewrite. */
  async import(stage: ImportStage): Promise<{ count: number; ids: Map<string, string> }> {
    const { client, sourceSpaceId, spaceId: sid } = stage;
    const assetDocs: FirebaseDoc[] = [];
    for await (const page of client.pages(sourceSpaceId, 'assets')) assetDocs.push(...page);
    const assetIds = new Map(assetDocs.map(doc => [doc.id, newUuid(timestamps(doc).createdAt)]));
    const files = assetDocs.filter(doc => doc['kind'] === 'FILE');
    stage.total(files.length);
    let assetCount = 0;
    for (const doc of assetDocs) {
      const id = assetIds.get(doc.id)!;
      const parent = typeof doc['parentPath'] === 'string' ? doc['parentPath'] : '';
      const parentPath = parent
        .split('/')
        .filter(Boolean)
        .map(segment => {
          const mapped = assetIds.get(segment);
          if (!mapped) stage.warn(`${str(doc['name']) ?? doc.id}: keeps an unmapped parent folder '${segment}'`);
          return mapped ?? segment;
        })
        .join('/');
      const isFile = doc['kind'] === 'FILE';
      let stored: { size: number; md5: string } | undefined;
      let extracted: { metadata?: Record<string, unknown>; alt?: string } | undefined;
      if (isFile) {
        const stream = await client.assetFile(sourceSpaceId, doc.id).catch(error => {
          throw new StageFailure('assets', `Downloading asset '${str(doc['name']) ?? doc.id}' failed: ${(error as Error).message}`);
        });
        if (stream) {
          const key = `spaces/${sid}/assets/${id}/original`;
          stored = await this.storage.put(key, stream);
          if (!obj(doc['metadata']))
            extracted = await this.metadata.extract(key, str(doc['type']) ?? 'application/octet-stream', str(doc['alt']));
        } else {
          stage.warn(`${str(doc['name']) ?? doc.id}: no file in Firebase, the asset is kept without it`);
        }
      }
      await this.assets.insert({
        id,
        spaceId: sid,
        legacyId: doc.id,
        kind: isFile ? 'FILE' : 'FOLDER',
        name: str(doc['name']) ?? doc.id,
        parentPath,
        extension: isFile ? (typeof doc['extension'] === 'string' ? doc['extension'] : '') : null,
        type: isFile ? str(doc['type']) : null,
        size: isFile ? (stored?.size ?? (typeof doc['size'] === 'number' ? doc['size'] : null)) : null,
        md5: stored?.md5 ?? null,
        alt: str(doc['alt']) ?? extracted?.alt ?? null,
        source: str(doc['source']),
        metadata: obj<Record<string, unknown>>(doc['metadata']) ?? extracted?.metadata ?? null,
        inProgress: false,
        ...timestamps(doc),
      });
      assetCount++;
      if (assetCount % 50 === 0) await stage.progress(assetCount);
    }
    return { count: assetCount, ids: assetIds };
  }
}
