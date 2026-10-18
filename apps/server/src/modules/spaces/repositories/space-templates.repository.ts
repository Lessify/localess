import { Inject, Injectable } from '@nestjs/common';
import { type ContentData, DEFAULT_LOCALE } from '@localess/shared';
import { DATABASE, type Database } from '../../../infra/database/database.module.js';
import { newUuid } from '../../../infra/database/id.js';
import { assets, contents, schemas, spaceLocales, translations } from '../../../infra/database/schema.js';
import { transaction, type Transaction } from '../../../infra/database/transaction.js';
import { guardUploads, releaseUploadGuards } from '../../../shared/data-rules/storage-deletions.js';
import { requireSpace, type SpaceRow } from '../../../shared/queries/space.query.js';
import { contentRefs } from '../../../shared/data-rules/content-refs.js';
import type { SpaceTemplate } from '../templates/index.js';
import { SpacesRepository } from './spaces.repository.js';

/** A template file already in storage (`SpacesService.createFromTemplate` stores it before the transaction). */
export interface StoredTemplateFile {
  /** The template's key of the asset. */
  key: string;
  id: string;
  size: number;
  md5: string;
  metadata: Record<string, unknown> | null;
}

/** Rows per insert: well under Postgres' 65,535 bind parameters (a translation row binds 7). */
const CHUNK = 1000;

/**
 * A new space with what its template holds, in one transaction: the space as `SpacesRepository.create` makes it (default
 * locale, preview token, `spaces` event), then the template's locales, schemas, assets (files already stored, their upload guards released here), contents and
 * translations. Nothing else is
 * needed: a new space has no drafts to drop, and nobody reads its schemas or translations before the commit.
 */
@Injectable()
export class SpaceTemplatesRepository {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly spaces: SpacesRepository,
  ) {}

  /** Before storing a template's files: the sweeper removes them unless the space is created (as for an upload). */
  guardFiles(spaceId: string, assetIds: string[]): Promise<void> {
    return transaction(this.db, undefined, async t => {
      for (let start = 0; start < assetIds.length; start += CHUNK) await guardUploads(t, spaceId, assetIds.slice(start, start + CHUNK));
    });
  }

  /** Releases the guards of files the caller removed itself. */
  releaseFiles(spaceId: string, assetIds: string[]): Promise<void> {
    return releaseUploadGuards(this.db, spaceId, assetIds);
  }

  createSpace(
    name: string,
    template: SpaceTemplate,
    tx?: Transaction,
    prepared?: { spaceId: string; files: StoredTemplateFile[] },
  ): Promise<SpaceRow> {
    return transaction(this.db, tx, async t => {
      const { id: spaceId } = await this.spaces.create(name, DEFAULT_LOCALE.id, t, prepared?.spaceId);
      const locales = template.locales ?? [];
      if (locales.length) {
        await t.insert(spaceLocales).values(locales.map((localeId, index) => ({ spaceId, localeId, position: index + 1 })));
      }
      if (template.schemas.length) {
        await t.insert(schemas).values(
          // Templates are in the export format, where `id` is the name.
          template.schemas.map(schema => ({
            id: newUuid(),
            spaceId,
            name: schema.id,
            type: schema.type,
            displayName: schema.displayName,
            description: schema.description,
            labels: schema.labels,
            previewField: 'previewField' in schema ? schema.previewField : undefined,
            fields: 'fields' in schema ? schema.fields : undefined,
            values: 'values' in schema ? schema.values : undefined,
          })),
        );
      }
      // Template keys → the new ids: the files stored beforehand keep theirs. One key, one item, across assets and
      // contents: a repeated key would hand the second item the first one's id.
      const items = [...(template.assets ?? []), ...(template.contents ?? [])];
      const keys = new Set<string>();
      for (const { key } of items) {
        if (keys.has(key)) throw new Error(`Duplicate template key: ${key}`);
        keys.add(key);
      }
      const ids = new Map<string, string>((prepared?.files ?? []).map(it => [it.key, it.id]));
      for (const { key } of items) if (!ids.has(key)) ids.set(key, newUuid());
      const id = (key: string): string => {
        const found = ids.get(key);
        if (!found) throw new Error(`Unknown template key: ${key}`);
        return found;
      };
      const parentId = (key?: string) => (key ? id(key) : null);
      const storedFiles = new Map((prepared?.files ?? []).map(it => [it.key, it]));
      const assetRows = (template.assets ?? []).map(asset => {
        const stored = storedFiles.get(asset.key);
        if (asset.kind === 'FILE' && !stored) throw new Error(`Template file not stored: ${asset.key}`);
        return {
          id: id(asset.key),
          spaceId,
          kind: asset.kind,
          name: asset.name,
          parentId: parentId(asset.parent),
          ...(asset.file && stored
            ? { extension: asset.file.extension, type: asset.file.type, size: stored.size, md5: stored.md5, metadata: stored.metadata }
            : {}),
        };
      });
      // In chunks, in declaration order: a folder is declared before what it holds.
      for (let start = 0; start < assetRows.length; start += CHUNK) await t.insert(assets).values(assetRows.slice(start, start + CHUNK));
      const fileIds = prepared?.files.map(it => it.id) ?? [];
      for (let start = 0; start < fileIds.length; start += CHUNK)
        await releaseUploadGuards(t, spaceId, fileIds.slice(start, start + CHUNK));
      const contentRows = (template.contents ?? []).map(content => {
        const data = content.data ? ({ _id: id(content.key), _schema: content.schema!, ...content.data(id) } as ContentData) : null;
        return {
          id: id(content.key),
          spaceId,
          kind: content.kind,
          name: content.name,
          slug: content.slug,
          parentId: parentId(content.parent),
          schema: content.schema ?? null,
          data,
          ...(data ? contentRefs(data) : { assets: null, links: null, references: null }),
        };
      });
      // In chunks, in declaration order (a folder before what it holds): the parent key is checked when each insert ends.
      for (let start = 0; start < contentRows.length; start += CHUNK)
        await t.insert(contents).values(contentRows.slice(start, start + CHUNK));
      const rows = (template.translations?.() ?? []).map(it => ({
        id: newUuid(),
        spaceId,
        key: it.key,
        locales: it.locales,
        labels: it.labels ?? null,
        description: it.description ?? null,
      }));
      for (let start = 0; start < rows.length; start += CHUNK) {
        await t.insert(translations).values(rows.slice(start, start + CHUNK));
      }
      return requireSpace(t, spaceId);
    });
  }
}
