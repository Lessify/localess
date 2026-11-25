import { Injectable, signal } from '@angular/core';
import { defer, finalize, Observable } from 'rxjs';

/** A save shorter than this never shows: quick saves don't make the logo blink. */
export const SAVE_ACTIVITY_DELAY_MS = 300;

/**
 * Whether the app is saving: a write to the API (any method but GET and HEAD, counted by `apiInterceptor`) has been
 * running for longer than {@link SAVE_ACTIVITY_DELAY_MS}. The sidebar logo swaps its colours while it is.
 */
@Injectable({ providedIn: 'root' })
export class SaveActivityService {
  private pending = 0;
  private timer?: ReturnType<typeof setTimeout>;
  private readonly _saving = signal(false);
  readonly saving = this._saving.asReadonly();

  /** Counts `request` as a save from its subscription until it completes, fails or is cancelled. */
  track<T>(request: Observable<T>): Observable<T> {
    return defer(() => {
      this.begin();
      return request.pipe(finalize(() => this.end()));
    });
  }

  private begin(): void {
    if (this.pending++ === 0) this.timer = setTimeout(() => this._saving.set(true), SAVE_ACTIVITY_DELAY_MS);
  }

  private end(): void {
    if (--this.pending > 0) return;
    clearTimeout(this.timer);
    this._saving.set(false);
  }
}
