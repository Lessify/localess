import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { vi } from 'vitest';

import { SAVE_ACTIVITY_DELAY_MS, SaveActivityService } from './save-activity.service';

describe('SaveActivityService', () => {
  let service: SaveActivityService;

  beforeEach(() => {
    vi.useFakeTimers();
    service = TestBed.inject(SaveActivityService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a save only once it has run longer than the delay', () => {
    const request = new Subject<void>();
    service.track(request).subscribe();

    vi.advanceTimersByTime(SAVE_ACTIVITY_DELAY_MS - 1);
    expect(service.saving()).toBe(false);

    vi.advanceTimersByTime(1);
    expect(service.saving()).toBe(true);

    request.complete();
    expect(service.saving()).toBe(false);
  });

  it('never shows a quick save', () => {
    const request = new Subject<void>();
    service.track(request).subscribe();

    request.complete();
    vi.advanceTimersByTime(SAVE_ACTIVITY_DELAY_MS * 2);

    expect(service.saving()).toBe(false);
  });

  it('keeps showing until the last of several saves ends, failed or cancelled ones included', () => {
    const first = new Subject<void>();
    const second = new Subject<void>();
    const third = new Subject<void>();
    service.track(first).subscribe({ error: () => undefined });
    service.track(second).subscribe();
    const cancelled = service.track(third).subscribe();
    vi.advanceTimersByTime(SAVE_ACTIVITY_DELAY_MS);

    first.error(new Error('failed'));
    expect(service.saving()).toBe(true);
    cancelled.unsubscribe();
    expect(service.saving()).toBe(true);
    second.complete();
    expect(service.saving()).toBe(false);
  });

  it('does not count a request nobody subscribed to', () => {
    service.track(new Subject<void>());
    vi.advanceTimersByTime(SAVE_ACTIVITY_DELAY_MS);

    expect(service.saving()).toBe(false);
  });
});
