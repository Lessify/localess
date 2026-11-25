import { HttpErrorResponse } from '@angular/common/http';
import { createEnvironmentInjector, EnvironmentInjector, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';

import { UploadProgress, UploadQueue } from './upload-queue';

describe('UploadQueue', () => {
  function setup(concurrency?: number) {
    const onError = vi.fn();
    const queue = TestBed.runInInjectionContext(() => new UploadQueue(onError, concurrency));
    return { queue, onError };
  }

  /** An upload that waits for the test: `progress` and `request` let it go on. */
  function pending() {
    const request = new Subject<unknown>();
    let progress: UploadProgress = () => undefined;
    const start = vi.fn((tell: UploadProgress) => {
      progress = tell;
      return request;
    });
    const finish = () => {
      request.next({});
      request.complete();
    };
    return { start, request, finish, progress: (loaded: number, total: number) => progress(loaded, total) };
  }

  const statuses = (queue: UploadQueue) => queue.items().map(it => it.status);

  it('starts three at a time and the next one when one ends', () => {
    const { queue } = setup();
    const uploads = [pending(), pending(), pending(), pending()];
    uploads.forEach((it, idx) => queue.add(`${idx}.png`, 10, it.start));

    expect(uploads.map(it => it.start.mock.calls.length)).toEqual([1, 1, 1, 0]);
    expect(statuses(queue)).toEqual(['uploading', 'uploading', 'uploading', 'waiting']);

    uploads[2].finish();
    expect(uploads[3].start).toHaveBeenCalledOnce();
    expect(statuses(queue)).toEqual(['uploading', 'uploading', 'done', 'uploading']);
    expect(queue.pending()).toBe(3);
    expect(queue.done()).toBe(1);
  });

  it('follows the progress of each file and of the batch', () => {
    const { queue } = setup();
    const [a, b] = [pending(), pending()];
    queue.add('a.png', 100, a.start);
    queue.add('b.png', 300, b.start);
    expect(queue.percent()).toBe(0);

    a.progress(50, 100);
    b.progress(150, 300);
    expect(queue.items().map(it => it.loaded)).toEqual([50, 150]);
    expect(queue.percent()).toBe(50);

    a.finish();
    expect(queue.percent()).toBe(63);
  });

  it('has no percent while no size is known', () => {
    const { queue } = setup();
    queue.add('photo.jpg', 0, pending().start);
    expect(queue.percent()).toBeUndefined();
  });

  it('drops the done files once the whole batch is over, and keeps the failed ones', () => {
    const { queue, onError } = setup();
    const [a, b] = [pending(), pending()];
    queue.add('a.png', 10, a.start);
    queue.add('b.png', 10, b.start);
    queue.add('c.png', 10, () => throwError(() => new HttpErrorResponse({ status: 413 })));

    expect(onError).toHaveBeenCalledExactlyOnceWith('c.png could not be uploaded: the file is too large.');
    a.finish();
    expect(statuses(queue)).toEqual(['done', 'uploading', 'error']);

    b.finish();
    expect(queue.items()).toEqual([
      { id: 3, name: 'c.png', status: 'error', loaded: 0, total: 10, error: 'c.png could not be uploaded: the file is too large.' },
    ]);
    expect(queue.failed()).toBe(1);
    expect(queue.pending()).toBe(0);
  });

  it('fails only the file whose start throws', () => {
    const { queue, onError } = setup();
    queue.add('broken.png', 10, () => {
      throw new Error('boom');
    });
    const next = vi.fn(() => of({}));
    queue.add('next.png', 10, next);

    expect(onError).toHaveBeenCalledWith('broken.png could not be uploaded.');
    expect(next).toHaveBeenCalledOnce();
    expect(statuses(queue)).toEqual(['error']);
  });

  it('retries a failed file with the same start', () => {
    const { queue } = setup();
    const start = vi
      .fn()
      .mockReturnValueOnce(throwError(() => new Error('boom')))
      .mockReturnValueOnce(of({}));
    queue.add('photo.png', 10, start);
    const [failed] = queue.items();

    queue.retry(failed.id);

    expect(start).toHaveBeenCalledTimes(2);
    expect(queue.items()).toEqual([]);
  });

  it('dismisses only a failed file', () => {
    const { queue } = setup();
    const uploading = pending();
    queue.add('a.png', 10, uploading.start);
    queue.add('b.png', 10, () => throwError(() => new Error('boom')));
    const [a, b] = queue.items();

    queue.dismiss(a.id);
    queue.retry(a.id);
    expect(queue.items().map(it => it.name)).toEqual(['a.png', 'b.png']);
    expect(uploading.start).toHaveBeenCalledOnce();

    queue.dismiss(b.id);
    expect(queue.items().map(it => it.name)).toEqual(['a.png']);
  });

  it('stops with its injection context', () => {
    const injector = createEnvironmentInjector([], TestBed.inject(EnvironmentInjector));
    const queue = runInInjectionContext(injector, () => new UploadQueue());
    injector.destroy();
    const start = vi.fn(() => of({}));

    queue.add('photo.png', 10, start);

    expect(start).not.toHaveBeenCalled();
  });
});
