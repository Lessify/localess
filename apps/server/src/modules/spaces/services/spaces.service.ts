import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Space } from '@localess/shared';
import { canPerform, type SpaceOverview, type SpaceTemplateSummary, UserPermission } from '@localess/shared';
import { APP_CONFIG, type AppConfig } from '../../../infra/config/config.js';
import { newUuid } from '../../../infra/database/id.js';
import { STORAGE_DRIVER, type StorageDriver } from '../../../infra/storage/storage.driver.js';
import { assetFilesPrefix, spaceFilesPrefix } from '../../../shared/data-rules/storage-deletions.js';
import { AssetMetadataService } from '../../../shared/services/asset-metadata.service.js';
import type { UserRow } from '../../../shared/models/user.js';
import type { SpaceRow } from '../../../shared/queries/space.query.js';
import { StorageSweeperService } from '../../../shared/services/storage-sweeper.service.js';
import { toPublicSpace, toSpace } from '../../../shared/transformers/space.transformer.js';
import { toPrincipal } from '../../../shared/transformers/user.transformer.js';
import { LocalesRepository } from '../repositories/locales.repository.js';
import { SpaceOverviewRepository } from '../repositories/space-overview.repository.js';
import { SpaceTemplatesRepository, type StoredTemplateFile } from '../repositories/space-templates.repository.js';
import { SpacesRepository } from '../repositories/spaces.repository.js';
import { EMPTY_TEMPLATE_ID, SPACE_TEMPLATES, type SpaceTemplate } from '../templates/index.js';

/** Template files stored in parallel, this many at a time. */
const STORE_BATCH = 50;

/** `ids` lists each of `current` once, in any order. */
function isPermutation(ids: string[], current: string[]): boolean {
  const known = new Set(current);
  return ids.length === known.size && new Set(ids).size === ids.length && ids.every(id => known.has(id));
}

/** Spaces, their locales and environments, and the dashboard overview. */
@Injectable()
export class SpacesService {
  constructor(
    private readonly spaces: SpacesRepository,
    private readonly locales: LocalesRepository,
    private readonly overviews: SpaceOverviewRepository,
    private readonly sweeper: StorageSweeperService,
    private readonly spaceTemplates: SpaceTemplatesRepository,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(STORAGE_DRIVER) private readonly storage: StorageDriver,
    private readonly metadata: AssetMetadataService,
  ) {}

  async list() {
    return (await this.spaces.findAll()).map(toSpace);
  }

  async get(spaceId: string) {
    return toSpace(await this.require(spaceId));
  }

  /** The space on the public API, or undefined (it answers 404 itself). */
  async findPublic(spaceId: string) {
    const space = await this.spaces.findById(spaceId);
    return space && toPublicSpace(space);
  }

  /** What the Create Space dialog offers this user, in order (docs/roadmap/space-templates.md). */
  templates(user: UserRow): SpaceTemplateSummary[] {
    return this.offered(user).map(({ id, name, description, icon }) => ({ id, name, description, icon }));
  }

  /**
   * With everything its template holds, in one transaction (no template: Empty). An unknown template, or a test one
   * while they are off, is a 400; one the user may not choose (a template other than Empty needs SCHEMA_CREATE), a 403.
   */
  async create(name: string, templateId: string | undefined, user: UserRow) {
    const id = templateId ?? EMPTY_TEMPLATE_ID;
    const template = this.available().find(it => it.id === id);
    if (!template) throw new BadRequestException('Unknown template');
    if (!this.offered(user).includes(template)) throw new ForbiddenException();
    return this.createFromTemplate(name, template);
  }

  /**
   * A template's files are stored before its transaction, the way an upload is: guarded first, so that if anything
   * fails they are removed (at once here, or by the sweeper when the guard expires); the transaction releases the
   * guards with the rows.
   */
  async createFromTemplate(name: string, template: SpaceTemplate): Promise<Space> {
    const files = (template.assets ?? []).filter(it => it.file);
    if (!files.length) return toSpace(await this.spaceTemplates.createSpace(name, template));
    const spaceId = newUuid();
    const ids = files.map(() => newUuid());
    await this.spaceTemplates.guardFiles(spaceId, ids);
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
          const metadata = asset.file!.metadata ?? (await this.metadata.extract(key, asset.file!.type, null)).metadata ?? null;
          return { key: asset.key, id, size: info.size, md5: info.md5, metadata };
        });
        // Every store of the batch settles before a failure is acted on: one still writing after the cleanup would
        // recreate the folder with its guard already released, and stay for good.
        const results = await Promise.allSettled(batch);
        const failed = results.find(it => it.status === 'rejected');
        if (failed) throw failed.reason;
        stored.push(...results.map(it => (it as PromiseFulfilledResult<StoredTemplateFile>).value));
      }
      return toSpace(await this.spaceTemplates.createSpace(name, template, undefined, { spaceId, files: stored }));
    } catch (error) {
      const cleaned = await this.storage.deletePrefix(spaceFilesPrefix(spaceId)).then(
        () => true,
        () => false,
      );
      if (cleaned) await this.spaceTemplates.releaseFiles(spaceId, ids);
      throw error;
    }
  }

  /** Test templates only with LOCALESS_TEST_TEMPLATES. */
  private available(): readonly SpaceTemplate[] {
    return this.config.testTemplates ? SPACE_TEMPLATES : SPACE_TEMPLATES.filter(it => !it.test);
  }

  private offered(user: UserRow): readonly SpaceTemplate[] {
    if (canPerform(toPrincipal(user), UserPermission.SCHEMA_CREATE)) return this.available();
    return this.available().filter(it => it.id === EMPTY_TEMPLATE_ID);
  }

  async rename(spaceId: string, name: string) {
    await this.require(spaceId);
    return toSpace(await this.spaces.rename(spaceId, name));
  }

  /** At the end of the space's list. */
  async createEnvironment(spaceId: string, environment: { name: string; url: string }) {
    await this.require(spaceId);
    return toSpace(await this.spaces.addEnvironment(spaceId, environment));
  }

  async updateEnvironment(spaceId: string, environmentId: string, environment: { name: string; url: string }) {
    await this.require(spaceId);
    return toSpace(this.environmentFound(await this.spaces.updateEnvironment(spaceId, environmentId, environment)));
  }

  async deleteEnvironment(spaceId: string, environmentId: string) {
    await this.require(spaceId);
    return toSpace(this.environmentFound(await this.spaces.deleteEnvironment(spaceId, environmentId)));
  }

  /** `environmentIds` is the space's environments in their new order: every one of them, each once. */
  async reorderEnvironments(spaceId: string, environmentIds: string[]) {
    const space = await this.require(spaceId);
    if (
      !isPermutation(
        environmentIds,
        space.environments.map(it => it.id),
      )
    ) {
      throw new BadRequestException("The new order must list each of the space's environments once");
    }
    return toSpace(await this.spaces.reorderEnvironments(spaceId, environmentIds));
  }

  /** Adds a locale from `locales` at the end of the space's list (no-op when it is already there, like `arrayUnion`). */
  async addLocale(spaceId: string, localeId: string) {
    const space = await this.require(spaceId);
    if (space.locales.some(it => it.id === localeId)) return toSpace(space);
    if (!(await this.locales.exists(localeId))) throw new BadRequestException(`Unknown locale ${localeId}`);
    return toSpace(await this.spaces.addLocale(spaceId, localeId));
  }

  async removeLocale(spaceId: string, localeId: string) {
    const space = await this.require(spaceId);
    if (space.defaultLocaleId === localeId) {
      throw new BadRequestException('The default locale cannot be removed; make another locale the default first');
    }
    return toSpace(await this.spaces.removeLocale(spaceId, localeId));
  }

  /** `localeIds` is the space's locales in their new order: every one of them, each once. */
  async reorderLocales(spaceId: string, localeIds: string[]) {
    const space = await this.require(spaceId);
    if (
      !isPermutation(
        localeIds,
        space.locales.map(it => it.id),
      )
    ) {
      throw new BadRequestException("The new order must list each of the space's locales once");
    }
    return toSpace(await this.spaces.reorderLocales(spaceId, localeIds));
  }

  async setDefaultLocale(spaceId: string, localeId: string) {
    const space = await this.require(spaceId);
    if (!space.locales.some(it => it.id === localeId)) throw new BadRequestException(`Locale ${localeId} is not in space locales`);
    return toSpace(await this.spaces.setDefaultLocale(spaceId, localeId));
  }

  /** Everything in the space goes with it: rows by FK cascade; its stored files are queued and swept right after. */
  async delete(spaceId: string): Promise<void> {
    const space = await this.require(spaceId);
    if (space.importStatus === 'IMPORTING') throw new ConflictException('The space is being imported');
    await this.spaces.delete(spaceId);
    this.sweeper.kick();
  }

  /** Dashboard numbers, computed on request (were stored on the space by the `space-calculateoverview` callable). */
  async overview(spaceId: string): Promise<SpaceOverview> {
    const space = await this.require(spaceId);
    const counts = await this.overviews.counts(spaceId);
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
    const space = await this.spaces.findById(spaceId);
    if (!space) throw new NotFoundException('Space not found');
    return space;
  }

  private environmentFound(space: SpaceRow | undefined): SpaceRow {
    if (!space) throw new NotFoundException('Environment not found');
    return space;
  }
}
