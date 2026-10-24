import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { TaskLogLevel } from '@localess/shared';
import { TaskLogService } from '@core/services/task-log.service';
import { TaskService } from '@core/services/task.service';

import { TaskDetailComponent } from './task-detail.component';

describe('TaskDetailComponent', () => {
  function setup() {
    const findOne = vi.fn().mockReturnValue(
      of({
        id: 't1',
        kind: 'TRANSLATION_IMPORT',
        status: 'ERROR',
        startedAt: '2026-10-24T10:00:40.000Z',
        finishedAt: '2026-10-24T10:02:50.000Z',
        createdAt: '2026-10-24T10:00:00.000Z',
      }),
    );
    const findLogs = vi.fn().mockReturnValue(
      of([
        { id: 'l1', level: TaskLogLevel.INFO, message: 'started' },
        { id: 'l2', level: TaskLogLevel.ERROR, message: 'boom', trace: 'stack...' },
      ]),
    );
    TestBed.configureTestingModule({
      providers: [
        { provide: TaskService, useValue: { findOne } },
        { provide: TaskLogService, useValue: { findAll: findLogs } },
      ],
    });
    TestBed.overrideComponent(TaskDetailComponent, { set: { template: '<ll-paginator [length]="0" />' } });
    const fixture = TestBed.createComponent(TaskDetailComponent);
    fixture.componentRef.setInput('spaceId', 'space1');
    fixture.componentRef.setInput('taskId', 't1');
    fixture.detectChanges();
    return { component: fixture.componentInstance, findOne, findLogs };
  }

  it('loads the task and its logs on init', () => {
    const { component, findOne, findLogs } = setup();

    expect(findOne).toHaveBeenCalledWith('space1', 't1');
    expect(findLogs).toHaveBeenCalledWith('space1', 't1');
    expect(component.task()?.kind).toBe('TRANSLATION_IMPORT');
    expect(component.isLoading()).toBe(false);
    expect(component.isLogsLoading()).toBe(false);
  });

  it('tells how long it waited and ran, and offers no download for a failed task', () => {
    const { component } = setup();

    expect(component.durations()).toEqual({ waited: '40 s', ran: '2 min 10 s' });
    expect(component.canDownload()).toBe(false);
  });

  it('toggleLogExpanded adds and removes a log id from the expanded set', () => {
    const { component } = setup();

    expect(component.isLogExpanded('l1')).toBe(false);
    component.toggleLogExpanded('l1');
    expect(component.isLogExpanded('l1')).toBe(true);
    component.toggleLogExpanded('l1');
    expect(component.isLogExpanded('l1')).toBe(false);
  });

  it('onFilterChange sets the data source filter as JSON', () => {
    const { component } = setup();

    component.onFilterChange({ search: 'boom', level: [TaskLogLevel.ERROR] });
    expect(component.dataSource.filter).toBe(JSON.stringify({ search: 'boom', level: [TaskLogLevel.ERROR] }));
  });
});
