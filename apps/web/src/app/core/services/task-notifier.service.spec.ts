import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ChangeEvent, ChangeEventsService } from '@core/api/change-events.service';
import { NotificationService } from '@core/services/notification.service';
import { TaskService } from '@core/services/task.service';
import { UserStore } from '@core/stores/user.store';
import { Task, TaskKind, TaskStatus } from '@localess/shared';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';

import { TaskNotifierService } from './task-notifier.service';

const task = (overrides: Partial<Task> = {}): Task =>
  ({
    id: 't1',
    kind: TaskKind.TRANSLATION_IMPORT,
    status: TaskStatus.FINISHED,
    createdAt: '',
    updatedAt: '',
    createdBy: { id: 'me', email: 'me@example.com' },
    ...overrides,
  }) as Task;

describe('TaskNotifierService', () => {
  let events: Subject<ChangeEvent>;
  let current: Task;

  function setup() {
    events = new Subject<ChangeEvent>();
    const findOne = vi.fn(() => of(current));
    const success = vi.fn();
    const error = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: ChangeEventsService, useValue: { changes: () => events } },
        { provide: TaskService, useValue: { findOne, downloadUrl: () => of('/url') } },
        { provide: NotificationService, useValue: { success, error } },
        { provide: UserStore, useValue: { id: signal('me') } },
      ],
    });
    const notifier = TestBed.inject(TaskNotifierService);
    notifier.start();
    return { notifier, findOne, success, error };
  }

  const update = (id = 't1') => events.next({ spaceId: 's1', entity: 'tasks', id, op: 'updated' });

  it('tells the user who started a task when it ends, once', () => {
    const { success } = setup();
    current = task();
    update();
    update();
    expect(success).toHaveBeenCalledTimes(1);
    expect(success.mock.calls[0][0]).toBe('Translation Import finished');
  });

  it("stays quiet about another user's task, and about one still running", () => {
    const { success, error } = setup();
    current = task({ createdBy: { id: 'other', email: 'o@example.com' } });
    update();
    current = task({ id: 't2', status: TaskStatus.IN_PROGRESS });
    update('t2');
    expect(success).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it('stays quiet while a dialog follows the task, and speaks once it was sent to the background', () => {
    const { notifier, success } = setup();
    current = task();
    notifier.follow('t1');
    update();
    expect(success).not.toHaveBeenCalled();
    notifier.unfollow('t1');
    update();
    expect(success).toHaveBeenCalledTimes(1);
  });

  it('reads a task the user may not see once, not on every progress event', () => {
    const { findOne } = setup();
    findOne.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    update();
    update();
    update();
    expect(findOne).toHaveBeenCalledTimes(1);
  });

  it('tells a failure as an error', () => {
    const { error } = setup();
    current = task({ status: TaskStatus.ERROR });
    update();
    expect(error.mock.calls[0][0]).toBe('Translation Import failed');
  });
});
