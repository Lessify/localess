import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Page, Space, SpacePageable } from '@localess/shared';
import { DEFAULT_LOCALE, type SpaceOverview, type SpaceTemplateId } from '@localess/shared';
import { APP_CONFIG, type AppConfig } from '../../../infra/config/config.js';
import { newUuid } from '../../../infra/database/id.js';
import { STORAGE_DRIVER, type StorageDriver } from '../../../infra/storage/storage.driver.js';
import { assetFilesPrefix, spaceFilesPrefix } from '../../../shared/data-rules/storage-deletions.js';
import { AssetMetadataService } from '../../../shared/services/asset-metadata.service.js';
import type { SpaceRow } from '../../../shared/queries/space.query.js';
import { StorageSweeperService } from '../../../shared/services/storage-sweeper.service.js';
import { toPublicSpace, toSpace } from '../../../shared/transformers/space.transformer.js';
import { toPage } from '../../../shared/utils/paging.js';
import { SpaceOverviewRepository } from '../repositories/space-overview.repository.js';
import { SpaceTemplateRepository, type StoredTemplateFile } from '../repositories/space-template.repository.js';
import { SpaceRepository } from '../repositories/space.repository.js';
import { SPACE_TEMPLATES, type SpaceTemplate } from '../templates/index.js';

/** Template files stored in parallel, this many at a time. */
const STORE_BATCH = 50;

/** Spaces and the dashboard overview (their locales and environments: `SpaceLocaleService`, `SpaceEnvironmentService`). */
@Injectable()
export class SpaceService {
  constructor(
    private readonly spaceRepository: SpaceRepository,
    private readonly spaceOverviewRepository: SpaceOverviewRepository,
    private readonly storageSweeperService: StorageSweeperService,
    private readonly spaceTemplateRepository: SpaceTemplateRepository,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(STORAGE_DRIVER) private readonly storage: StorageDriver,
    private readonly assetMetadataService: AssetMetadataService,
  ) {}

  /** One page of spaces (Admin → Spaces, and every page of it for the space switcher). */
  async findAll(query: SpacePageable): Promise<Page<Space>> {
    const { rows, total } = await this.spaceRepository.findPage(query);
    return toPage(rows, total, query, toSpace);
  }

  async findOne(spaceId: string) {
    return toSpace(await this.require(spaceId));
  }

  /** The space on the public API, or undefined (it answers 404 itself). */
  async findPublic(spaceId: string) {
    const space = await this.spaceRepository.findById(spaceId);
    return space && toPublicSpace(space);
  }

  /**
   * What the Create Space dialog offers, in order (docs/roadmap/space-templates.md). Whoever may create a space may
   * create it from any template (the route needs SPACE_MANAGEMENT, as creating does).
   */
  findTemplates(): SpaceTemplateId[] {
    return this.available().map(it => it.id);
  }

  /**
   * With everything its template holds, in one transaction; no template: the space alone (its default locale and preview
   * token). A test template while they are off is a 400 (an unknown id is refused by the controller's schema). No
   * permission beyond creating a space (SPACE_MANAGEMENT): a template is part of creating one.
   */
  async create(name: string, templateId: SpaceTemplateId | undefined) {
    if (!templateId) return toSpace(await this.spaceRepository.create(name, DEFAULT_LOCALE.id));
    const template = this.available().find(it => it.id === templateId);
    if (!template) throw new BadRequestException('Unknown template');
    return this.createFromTemplate(name, template);
  }

  /**
   * A template's files are stored before its transaction, the way an upload is: guarded first, so that if anything
   * fails they are removed (at once here, or by the sweeper when the guard expires); the transaction releases the
   * guards with the rows.
   */
  async createFromTemplate(name: string, template: SpaceTemplate): Promise<Space> {
    const files = (template.assets ?? []).filter(it => it.file);
    if (!files.length) return toSpace(await this.spaceTemplateRepository.createSpace(name, template));
    const spaceId = newUuid();
    const ids = files.map(() => newUuid());
    await this.spaceTemplateRepository.guardFiles(spaceId, ids);
    try {
      // In batches: a template can hold a thousand small files.
      const stored: StoredTemplateFile[] = [];
      for (let start = 0; start < files.length; start += STORE_BATCH) {
        const batch = files.slice(start, start + STORE_BATCH).map(async (asset, offset) => {
          const id = ids[start + offset];
          // The asset module's key for an original (modules/assets/utils/storage-keys.ts `originalKey`).
          const key = `${assetFilesPrefix(spaceId, id)}original`;
          const info = await this.storage.put(key, await asset.file!.bytes());
          // Known from the generator, or read as for an upload.
          const metadata = asset.file!.metadata ?? (await this.assetMetadataService.extract(key, asset.file!.type, null)).metadata ?? null;
          return { key: asset.key, id, size: info.size, md5: info.md5, metadata };
        });
        // Every store of the batch settles before a failure is acted on: one still writing after the cleanup would
        // recreate the folder with its guard already released, and stay for good.
        const results = await Promise.allSettled(batch);
        const failed = results.find(it => it.status === 'rejected');
        if (failed) throw failed.reason;
        stored.push(...results.map(it => (it as PromiseFulfilledResult<StoredTemplateFile>).value));
      }
      return toSpace(await this.spaceTemplateRepository.createSpace(name, template, undefined, { spaceId, files: stored }));
    } catch (error) {
      const cleaned = await this.storage.deletePrefix(spaceFilesPrefix(spaceId)).then(
        () => true,
        () => false,
      );
      if (cleaned) await this.spaceTemplateRepository.releaseFiles(spaceId, ids);
      throw error;
    }
  }

  /** Test templates only with LOCALESS_TEST_TEMPLATES. */
  private available(): readonly SpaceTemplate[] {
    return this.config.testTemplates ? SPACE_TEMPLATES : SPACE_TEMPLATES.filter(it => !it.test);
  }

  async rename(spaceId: string, name: string) {
    await this.require(spaceId);
    return toSpace(await this.spaceRepository.rename(spaceId, name));
  }

  /** Everything in the space goes with it: rows by FK cascade; its stored files are queued and swept right after. */
  async remove(spaceId: string): Promise<void> {
    const space = await this.require(spaceId);
    if (space.importStatus === 'IMPORTING') throw new ConflictException('The space is being imported');
    await this.spaceRepository.delete(spaceId);
    this.storageSweeperService.kick();
  }

  /** Dashboard numbers, computed on request (were stored on the space by the `space-calculateoverview` callable). */
  async findOverview(spaceId: string): Promise<SpaceOverview> {
    const space = await this.require(spaceId);
    const counts = await this.spaceOverviewRepository.counts(spaceId);
    return {
      counts: {
        locales: space.locales.length,
        translations: counts.translations,
        assets: counts.assets.files,
        contents: counts.contents,
        schemas: counts.schemas,
      },
      storage: { assets: counts.assets.size, assetsWithoutSize: counts.assets.withoutSize },
      progress: {
        total: counts.translations,
        locales: space.locales.map(locale => ({ ...locale, translated: counts.translatedBy.get(locale.id) ?? 0 })),
      },
    };
  }

  private async require(spaceId: string): Promise<SpaceRow> {
    const space = await this.spaceRepository.findById(spaceId);
    if (!space) throw new NotFoundException('Space not found');
    return space;
  }
}
