import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { TaskLogLevel } from '@shared/models/task.model';
import { TaskService } from '@shared/services/task.service';

import { TaskDetailComponent } from './task-detail.component';

describe('TaskDetailComponent', () => {
  function setup() {
    const findById = vi.fn().mockReturnValue(of({ id: 't1', kind: 'TRANSLATION_IMPORT', status: 'ERROR', message: 'boom' }));
    const findLogs = vi.fn().mockReturnValue(
      of([
        { id: 'l1', level: TaskLogLevel.INFO, message: 'started' },
        { id: 'l2', level: TaskLogLevel.ERROR, message: 'boom', trace: 'stack...' },
      ]),
    );
    TestBed.configureTestingModule({
      providers: [{ provide: TaskService, useValue: { findById, findLogs } }],
    });
    TestBed.overrideComponent(TaskDetailComponent, { set: { template: '<ll-paginator [length]="0" />' } });
    const fixture = TestBed.createComponent(TaskDetailComponent);
    fixture.componentRef.setInput('spaceId', 'space1');
    fixture.componentRef.setInput('taskId', 't1');
    fixture.detectChanges();
    return { component: fixture.componentInstance, findById, findLogs };
  }

  it('loads the task and its logs on init', () => {
    const { component, findById, findLogs } = setup();

    expect(findById).toHaveBeenCalledWith('space1', 't1');
    expect(findLogs).toHaveBeenCalledWith('space1', 't1');
    expect(component.task()?.message).toBe('boom');
    expect(component.isLoading()).toBe(false);
    expect(component.isLogsLoading()).toBe(false);
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
