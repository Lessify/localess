import { computed, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { defer, EMPTY, Observable, Subject } from 'rxjs';
import { catchError, ignoreElements, mergeMap, tap } from 'rxjs/operators';

import { uploadErrorMessage } from './upload-error';

/** Told the bytes sent so far and the bytes to send, as an upload goes. */
export type UploadProgress = (loaded: number, total: number) => void;

/** Starts one upload, telling `progress` as it goes; it completes when the file is stored and errors when it is not. */
export type UploadStart = (progress: UploadProgress) => Observable<unknown>;

export type UploadStatus = 'waiting' | 'uploading' | 'done' | 'error';

/** One file of an `UploadQueue`, as `ll-upload-queue` shows it. */
export interface UploadItem {
  readonly id: number;
  readonly name: string;
  readonly status: UploadStatus;
  /** Bytes sent. */
  readonly loaded: number;
  /** Bytes to send: the file's size until the request tells its own; 0 while unknown (a URL not downloaded yet). */
  readonly total: number;
  /** Why it failed (`uploadErrorMessage`), when `status` is `error`. */
  readonly error?: string;
}

/** How many files upload at the same time. */
export const UPLOAD_CONCURRENCY = 3;

/**
 * The files a screen uploads, `UPLOAD_CONCURRENCY` at a time, each on its own: a failed one is reported (`onError`, and
 * on its row) and the others go on. Done files stay listed until the whole batch is over, failed ones until retried or
 * dismissed. Create it in an injection context (a field): it stops with its component.
 */
export class UploadQueue {
  private readonly state = signal<readonly UploadItem[]>([]);
  /** Every file of the batch, in the order added. */
  readonly items = this.state.asReadonly();
  /** Waiting or uploading. */
  readonly pending = computed(() => this.state().filter(it => it.status === 'waiting' || it.status === 'uploading').length);
  readonly done = computed(() => this.state().filter(it => it.status === 'done').length);
  readonly failed = computed(() => this.state().filter(it => it.status === 'error').length);
  /** Of the bytes of the batch (failed files left out); undefined while no size is known. */
  readonly percent = computed(() => {
    const items = this.state().filter(it => it.status !== 'error');
    const total = items.reduce((sum, it) => sum + it.total, 0);
    if (!total) return undefined;
    const loaded = items.reduce((sum, it) => sum + (it.status === 'done' ? it.total : it.loaded), 0);
    return Math.min(100, Math.round((loaded / total) * 100));
  });

  /** How to start each file, kept for a retry; gone once it is stored or dismissed. */
  private readonly starts = new Map<number, UploadStart>();
  private readonly queue$ = new Subject<number>();
  private nextId = 1;

  constructor(
    private readonly onError: (message: string) => void = () => undefined,
    concurrency = UPLOAD_CONCURRENCY,
  ) {
    // Each upload handles its own failure (`run`): an error reaching this stream would end it, and every later upload with it.
    this.queue$
      .pipe(
        mergeMap(id => this.run(id), concurrency),
        takeUntilDestroyed(),
      )
      .subscribe();
  }

  /** Lists the file and uploads it once fewer than `concurrency` are going. `size`: 0 when unknown. */
  add(name: string, size: number, start: UploadStart): void {
    const id = this.nextId++;
    this.starts.set(id, start);
    this.state.update(items => [...items, { id, name, status: 'waiting', loaded: 0, total: size }]);
    this.queue$.next(id);
  }

  /** A failed file, queued again. */
  retry(id: number): void {
    if (!this.starts.has(id) || this.find(id)?.status !== 'error') return;
    this.patch(id, { status: 'waiting', loaded: 0, error: undefined });
    this.queue$.next(id);
  }

  /** A failed file, taken off the list. */
  dismiss(id: number): void {
    if (this.find(id)?.status !== 'error') return;
    this.starts.delete(id);
    this.state.update(items => items.filter(it => it.id !== id));
  }

  private run(id: number): Observable<never> {
    const start = this.starts.get(id);
    const item = this.find(id);
    if (!start || !item) return EMPTY;
    this.patch(id, { status: 'uploading' });
    // `defer`: a start that throws fails its own file, not the queue.
    return defer(() => start((loaded, total) => this.patch(id, { loaded, total }))).pipe(
      ignoreElements(),
      tap({
        complete: () => {
          this.starts.delete(id);
          this.patch(id, { status: 'done' });
          this.endBatch();
        },
      }),
      catchError((error: unknown) => {
        const message = uploadErrorMessage(item.name, error);
        this.patch(id, { status: 'error', error: message });
        this.onError(message);
        this.endBatch();
        return EMPTY;
      }),
    );
  }

  /** Once nothing waits or uploads, the done files go: the list (and the badge) keep only what needs the user. */
  private endBatch(): void {
    if (this.pending()) return;
    this.state.update(items => items.filter(it => it.status !== 'done'));
  }

  private find(id: number): UploadItem | undefined {
    return this.state().find(it => it.id === id);
  }

  private patch(id: number, changes: Partial<UploadItem>): void {
    this.state.update(items => items.map(it => (it.id === id ? { ...it, ...changes } : it)));
  }
}
