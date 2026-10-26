import { Inject, Injectable } from '@nestjs/common';

import { newUuid } from '../../../infra/database/id.js';
import { STORAGE_DRIVER, type StorageDriver } from '../../../infra/storage/storage.driver.js';
import { AssetMetadataService } from '../../../shared/services/asset-metadata.service.js';
import { assetOriginalKey, toOriginalName } from '../../../shared/utils/asset-files.js';
import { AssetImportRepository } from '../repositories/asset-import.repository.js';
import { FirebaseConnectionError, type FirebaseDoc } from '../utils/firebase-client.js';
import { obj, str, timestamps } from '../utils/firebase-docs.js';
import { type ImportStage, StageFailure } from '../utils/firebase-import.utils.js';

/**
 * Stage 8: the assets: ids first, so folder paths can be mapped; then rows and files, folders before what they hold
 * (the tree is linked by `parent_id`, and Firestore pages come in no tree order). An asset's parent is the folder its
 * Firebase `parentPath` ends with; one that is missing, not a folder, or would close a loop leaves it at the root, with
 * a warning.
 */
@Injectable()
export class AssetImportService {
  constructor(
    private readonly assetImportRepository: AssetImportRepository,
    @Inject(STORAGE_DRIVER) private readonly storage: StorageDriver,
    private readonly assetMetadataService: AssetMetadataService,
  ) {}

  /** Answers the count and the Firebase id → new id map, for the reference rewrite. */
  async import(stage: ImportStage): Promise<{ count: number; ids: Map<string, string> }> {
    const { client, sourceSpaceId, spaceId: sid } = stage;
    const assetDocs: FirebaseDoc[] = [];
    for await (const page of client.pages(sourceSpaceId, 'assets')) assetDocs.push(...page);
    const assetIds = new Map(assetDocs.map(doc => [doc.id, newUuid(timestamps(doc).createdAt)]));
    const files = assetDocs.filter(doc => doc['kind'] === 'FILE');
    stage.total(files.length);
    const parents = this.planParents(stage, assetDocs, assetIds);
    let assetCount = 0;
    for (const doc of parents.order) {
      const id = assetIds.get(doc.id)!;
      const isFile = doc['kind'] === 'FILE';
      const extension = typeof doc['extension'] === 'string' ? doc['extension'] : '';
      // Stored by its Firebase file name (`name` + `extension`), as an upload is.
      const originalName = isFile ? toOriginalName(`${str(doc['name']) ?? doc.id}${extension}`) : null;
      let stored: { size: number; md5: string } | undefined;
      let extracted: { metadata?: Record<string, unknown>; alt?: string } | undefined;
      if (isFile) {
        const name = str(doc['name']) ?? doc.id;
        // One file Firebase cannot serve does not stop the import (the asset is kept without it); Firebase being
        // unreachable does.
        let unserved: string | undefined;
        const stream = await client.assetFile(sourceSpaceId, doc.id).catch(error => {
          if (error instanceof FirebaseConnectionError && error.reason === 'server-error') {
            unserved = error.message;
            return null;
          }
          throw new StageFailure('assets', `Downloading asset '${name}' failed: ${(error as Error).message}`);
        });
        if (stream && originalName) {
          const key = assetOriginalKey(sid, id, originalName);
          stored = await this.storage.put(key, stream);
          if (!obj(doc['metadata']))
            extracted = await this.assetMetadataService.extract(key, str(doc['type']) ?? 'application/octet-stream', str(doc['alt']));
        } else if (unserved) {
          stage.warn(`${name}: Firebase could not serve its file (${unserved}), the asset is kept without it`);
        } else {
          stage.warn(`${name}: no file in Firebase, the asset is kept without it`);
        }
      }
      await this.assetImportRepository.insert({
        id,
        spaceId: sid,
        legacyId: doc.id,
        kind: isFile ? 'FILE' : 'FOLDER',
        name: str(doc['name']) ?? doc.id,
        originalName,
        parentId: parents.parentOf.get(doc.id) ?? null,
        extension: isFile ? extension : null,
        type: isFile ? str(doc['type']) : null,
        size: isFile ? (stored?.size ?? (typeof doc['size'] === 'number' ? doc['size'] : null)) : null,
        md5: stored?.md5 ?? null,
        alt: str(doc['alt']) ?? extracted?.alt ?? null,
        source: str(doc['source']),
        metadata: obj<Record<string, unknown>>(doc['metadata']) ?? extracted?.metadata ?? null,
        ...timestamps(doc),
      });
      assetCount++;
      if (assetCount % 50 === 0) await stage.progress(assetCount);
    }
    return { count: assetCount, ids: assetIds };
  }

  /**
   * Each asset's parent (the new id of the folder its Firebase `parentPath` ends with), and the order to insert them in:
   * folders once their parent is in, then files.
   */
  private planParents(
    stage: ImportStage,
    docs: FirebaseDoc[],
    assetIds: Map<string, string>,
  ): { order: FirebaseDoc[]; parentOf: Map<string, string | null> } {
    const folderIds = new Set(docs.filter(doc => doc['kind'] !== 'FILE').map(doc => doc.id));
    const parentOf = new Map<string, string | null>();
    // Firebase id of the parent folder, or null.
    const wanted = new Map<string, string | null>();
    for (const doc of docs) {
      const parentPath = typeof doc['parentPath'] === 'string' ? doc['parentPath'] : '';
      const last = parentPath.split('/').filter(Boolean).pop();
      if (last && !folderIds.has(last)) {
        stage.warn(`${str(doc['name']) ?? doc.id}: parent folder '${last}' not found, imported at the root`);
      }
      wanted.set(doc.id, last && folderIds.has(last) ? last : null);
    }
    const order: FirebaseDoc[] = [];
    const placed = new Set<string>();
    let pending = docs.filter(doc => doc['kind'] !== 'FILE');
    while (pending.length) {
      const ready = pending.filter(doc => {
        const parent = wanted.get(doc.id);
        return !parent || placed.has(parent);
      });
      // Nothing ready: the rest wait on a loop. Follow the parents from the first one to a folder met twice, which is
      // on the loop (the first one may only wait on it), and break the loop there by putting it at the root.
      if (!ready.length) {
        const seen = new Set<string>();
        let at = pending[0].id;
        while (!seen.has(at)) {
          seen.add(at);
          at = wanted.get(at)!;
        }
        const onLoop = docs.find(doc => doc.id === at)!;
        stage.warn(`${str(onLoop['name']) ?? onLoop.id}: parent folder '${wanted.get(at)}' would make a cycle, imported at the root`);
        wanted.set(at, null);
        continue;
      }
      for (const doc of ready) {
        order.push(doc);
        placed.add(doc.id);
      }
      pending = pending.filter(doc => !placed.has(doc.id));
    }
    order.push(...docs.filter(doc => doc['kind'] === 'FILE'));
    for (const doc of docs) {
      const parent = wanted.get(doc.id);
      parentOf.set(doc.id, parent ? assetIds.get(parent)! : null);
    }
    return { order, parentOf };
  }
}
