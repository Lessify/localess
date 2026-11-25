import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ChangeEvent, ChangeEventsService } from '@core/api/change-events.service';
import { Subject } from 'rxjs';
import { vi } from 'vitest';

import { TaskLog } from '@localess/shared';
import { TaskLogService } from './task-log.service';

const BASE = '/api/app/spaces/space-1/tasks';

describe('TaskLogService', () => {
  let http: HttpTestingController;
  let events: Subject<ChangeEvent>;

  function setup() {
    events = new Subject<ChangeEvent>();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: ChangeEventsService, useValue: { changes: () => events } }],
    });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(TaskLogService);
  }

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('findAll() reads the task logs and refetches on log events of that task only', async () => {
    vi.useFakeTimers();
    const service = setup();
    const results: TaskLog[][] = [];
    const subscription = service.findAll('space-1', 't1').subscribe(it => results.push(it));
    http.expectOne(`${BASE}/t1/logs`).flush([]);

    events.next({ spaceId: 'space-1', entity: 'task_logs', id: 't2', op: 'created' });
    events.next({ spaceId: 'space-1', entity: 'tasks', id: 't1', op: 'updated' });
    await vi.advanceTimersByTimeAsync(200);
    http.expectNone(`${BASE}/t1/logs`);

    events.next({ spaceId: 'space-1', entity: 'task_logs', id: 't1', op: 'created' });
    await vi.advanceTimersByTimeAsync(200);
    http.expectOne(`${BASE}/t1/logs`).flush([{ id: '1' } as TaskLog]);
    expect(results).toEqual([[], [{ id: '1' }]]);
    subscription.unsubscribe();
  });
});
