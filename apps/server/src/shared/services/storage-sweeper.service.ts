import { Inject, Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { STORAGE_DRIVER, type StorageDriver } from '../../infra/storage/storage.driver.js';
import { StorageDeletionRepository } from '../repositories/storage-deletion.repository.js';

const HOUR = 60 * 60 * 1000;
/** Entries per sweep, one at a time. */
const BATCH = 100;
/** After the 1st, 2nd, 3rd failure, then every 6 hours. */
const RETRY_MS = [60 * 1000, 5 * 60 * 1000, 30 * 60 * 1000, 6 * HOUR];

/**
 * Deletes the stored files queued in `storage_deletions` (shared/data-rules/storage-deletions.ts), one prefix at a
 * time. Runs at start (what a crash or restart left behind), then every hour; a delete also kicks it right after its
 * commit, so files normally go at once. Every instance sweeps; the row lock keeps two from taking the same entry.
 */
@Injectable()
export class StorageSweeperService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(StorageSweeperService.name);
  private running: Promise<void> | undefined;
  private again = false;

  constructor(
    private readonly storageDeletionRepository: StorageDeletionRepository,
    @Inject(STORAGE_DRIVER) private readonly storage: StorageDriver,
  ) {}

  onApplicationBootstrap(): void {
    this.kick();
  }

  @Interval('storage-sweep', HOUR)
  hourly(): void {
    this.kick();
  }

  /** Starts a sweep without waiting for it; one already running sweeps once more when it is done. */
  kick(): void {
    if (this.running) {
      this.again = true;
      return;
    }
    this.running = (async () => {
      do {
        this.again = false;
        await this.sweep().catch(error => this.logger.error(`Storage sweep failed: ${error}`));
      } while (this.again);
    })().finally(() => (this.running = undefined));
  }

  /** Resolves when no kicked sweep is running (tests, shutdown). */
  async whenIdle(): Promise<void> {
    while (this.running) await this.running;
  }

  async onApplicationShutdown(): Promise<void> {
    await this.whenIdle();
  }

  /** Up to a batch of due entries, one at a time; how many were taken. */
  async sweep(): Promise<number> {
    let taken = 0;
    while (taken < BATCH) {
      let failure: { prefix: string; attempts: number; error: unknown } | undefined;
      const found = await this.storageDeletionRepository
        .next(async (entry, owned) => {
          // Its asset (or space) exists again: the files are live, only the entry goes.
          if (owned) return;
          try {
            await this.storage.deletePrefix(entry.prefix);
          } catch (error) {
            failure = { prefix: entry.prefix, attempts: entry.attempts, error };
            throw error;
          }
        })
        .catch(error => {
          if (!failure) throw error;
          return true;
        });
      if (!found) break;
      taken++;
      if (failure) {
        const message = failure.error instanceof Error ? failure.error.message : String(failure.error);
        this.logger.warn(`Could not delete stored files under ${failure.prefix} (attempt ${failure.attempts + 1}): ${message}`);
        await this.storageDeletionRepository.failed(failure.prefix, message, RETRY_MS[Math.min(failure.attempts, RETRY_MS.length - 1)]);
      }
    }
    return taken;
  }
}
