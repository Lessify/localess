import { TestBed } from '@angular/core/testing';
import { UploadProgress, UploadQueue } from '@core/utils/upload-queue';
import { Subject, throwError } from 'rxjs';

import { UploadQueueComponent } from './upload-queue.component';

describe('UploadQueueComponent', () => {
  function setup() {
    const queue = TestBed.runInInjectionContext(() => new UploadQueue());
    const fixture = TestBed.createComponent(UploadQueueComponent);
    fixture.componentRef.setInput('queue', queue);
    fixture.detectChanges();
    return { fixture, queue, component: fixture.componentInstance };
  }

  const pill = (fixture: ReturnType<typeof setup>['fixture']) =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('[data-testid="upload-queue"]');

  it('shows nothing while the queue is empty', () => {
    expect(pill(setup().fixture)).toBeNull();
  });

  it('tells how many of the batch are done while uploading', () => {
    const { fixture, queue } = setup();
    const requests = [new Subject<unknown>(), new Subject<unknown>()];
    let progress: UploadProgress = () => undefined;
    queue.add('a.png', 100, tell => {
      progress = tell;
      return requests[0];
    });
    queue.add('b.png', 100, () => requests[1]);
    requests[1].next({});
    requests[1].complete();
    progress(50, 100);
    fixture.detectChanges();

    expect(pill(fixture)?.getAttribute('aria-label')).toBe('Uploading 1 of 2');
    expect(pill(fixture)?.textContent).toContain('1 of 2');
  });

  it('keeps the failed files told once the others are done', () => {
    const { fixture, queue } = setup();
    queue.add('big.zip', 100, () => throwError(() => new Error('boom')));
    fixture.detectChanges();

    expect(pill(fixture)?.getAttribute('aria-label')).toBe('Uploads, 1 failed');
    expect(pill(fixture)?.textContent).toContain('1 failed');
  });

  it('has no file percent while the size is unknown', () => {
    const { component } = setup();
    expect(component.percentOf({ id: 1, name: 'x', status: 'uploading', loaded: 0, total: 0 })).toBeUndefined();
    expect(component.percentOf({ id: 1, name: 'x', status: 'uploading', loaded: 25, total: 100 })).toBe(25);
  });
});
