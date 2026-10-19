import { Injectable } from '@nestjs/common';
import { DEFAULT_LOCALE, type FirebaseImportStage, type Locale } from '@localess/shared';
import { newUuid } from '../../../infra/database/id.js';
import { SpaceImportRepository } from '../repositories/space-import.repository.js';
import type { FirebaseClient, FirebaseDoc } from '../utils/firebase-client.js';
import { obj, str, timestamps } from '../utils/firebase-docs.js';
import type { ImportStage } from '../utils/firebase-import.utils.js';

/** The space stage's outcome, which the locales and environments stages report on. */
export interface ImportedSpace {
  id: string;
  source: FirebaseDoc;
  keptLocales: string[];
  skippedLocales: Locale[];
  sourceDefault: string | undefined;
  defaultLocaleId: string;
}

/** Stages 1–3: the space with its locales (set with it) and its environments, and the end of the import. */
@Injectable()
export class SpaceImportService {
  constructor(private readonly spaceImportRepository: SpaceImportRepository) {}

  /** Creates the space, linked to the run (see `SpaceImportRepository.create`). */
  async importSpace(runId: string, client: FirebaseClient, sourceSpaceId: string, stages: FirebaseImportStage[]): Promise<ImportedSpace> {
    const source = await client.space(sourceSpaceId);
    const sid = newUuid(timestamps(source).createdAt);
    // Only locales in the `locales` table are kept; the default falls back to the first kept one, else English.
    const known = await this.spaceImportRepository.findLocaleIds();
    const sourceLocales = (Array.isArray(source['locales']) ? source['locales'] : []) as Locale[];
    const keptLocales = [...new Set(sourceLocales.map(it => it?.id).filter(id => typeof id === 'string' && known.has(id)))];
    const skippedLocales = sourceLocales.filter(it => !keptLocales.includes(it?.id));
    const sourceDefault = obj<Locale>(source['localeFallback'])?.id;
    const defaultLocaleId = sourceDefault && keptLocales.includes(sourceDefault) ? sourceDefault : (keptLocales[0] ?? DEFAULT_LOCALE.id);
    if (!keptLocales.length) keptLocales.push(defaultLocaleId);
    await this.spaceImportRepository.create(
      runId,
      { id: sid, name: str(source['name']) ?? sourceSpaceId, defaultLocaleId, ...timestamps(source) },
      keptLocales,
      stages,
    );
    return { id: sid, source, keptLocales, skippedLocales, sourceDefault, defaultLocaleId };
  }

  /** The locales stage: already written with the space, it reports what was skipped. Answers the kept count. */
  reportLocales(space: ImportedSpace, stage: Pick<ImportStage, 'warn'>): number {
    for (const it of space.skippedLocales) stage.warn(`${it?.id ?? 'unknown'}: not a known locale, skipped (its values are kept, unused)`);
    if (space.sourceDefault && space.sourceDefault !== space.defaultLocaleId) {
      stage.warn(`default locale ${space.sourceDefault} skipped; ${space.defaultLocaleId} is the default`);
    }
    return space.keptLocales.length;
  }

  /** The environments with a name and a URL, in order. Answers their count. */
  async importEnvironments(space: ImportedSpace, stage: ImportStage): Promise<number> {
    const sourceEnvironments = (Array.isArray(space.source['environments']) ? space.source['environments'] : []) as Partial<
      Record<'name' | 'url', unknown>
    >[];
    const environments = sourceEnvironments.filter(
      (it): it is { name: string; url: string } => typeof it?.name === 'string' && typeof it?.url === 'string',
    );
    if (environments.length < sourceEnvironments.length) {
      stage.warn(`${sourceEnvironments.length - environments.length} without a name or URL, skipped`);
    }
    if (environments.length) {
      await this.spaceImportRepository.insertEnvironments(
        environments.map((it, position) => ({ id: newUuid(), spaceId: stage.spaceId, name: it.name, url: it.url, position })),
      );
    }
    return environments.length;
  }

  /** After the last stage: what was served while the import ran is built again (the run is then saved FINISHED). */
  dropContentSnapshots(spaceId: string): Promise<void> {
    return this.spaceImportRepository.dropContentSnapshots(spaceId);
  }

  /** Once the run is FINISHED: the space appears for clients. */
  announce(spaceId: string): Promise<void> {
    return this.spaceImportRepository.publishCreated(spaceId);
  }
}
