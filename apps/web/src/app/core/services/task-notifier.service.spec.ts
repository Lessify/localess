import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ChangeEvent, ChangeEventsService } from '@core/api/change-events.service';
import { NotificationService } from '@core/services/notification.service';
import { TaskService } from '@core/services/task.service';
import { SpaceStore } from '@core/stores/space.store';
import { UserStore } from '@core/stores/user.store';
import { Task, TaskKind, TaskStatus } from '@localess/shared';
import { Observable, of, Subject, throwError } from 'rxjs';
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
  /** One stream per space, and how many subscribe to each. */
  let streams: Map<string, Subject<ChangeEvent>>;
  let listeners: Map<string, number>;
  let selectedSpaceId: ReturnType<typeof signal<string | undefined>>;
  let current: Task;

  function setup() {
    streams = new Map();
    listeners = new Map();
    selectedSpaceId = signal<string | undefined>('s1');
    const changes = (spaceId: string) =>
      new Observable<ChangeEvent>(subscriber => {
        if (!streams.has(spaceId)) streams.set(spaceId, new Subject());
        listeners.set(spaceId, (listeners.get(spaceId) ?? 0) + 1);
        const subscription = streams.get(spaceId)!.subscribe(subscriber);
        return () => {
          listeners.set(spaceId, listeners.get(spaceId)! - 1);
          subscription.unsubscribe();
        };
      });
    const findOne = vi.fn(() => of(current));
    const success = vi.fn();
    const error = vi.fn();
    const info = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: ChangeEventsService, useValue: { changes } },
        { provide: TaskService, useValue: { findOne, downloadUrl: () => of('/url') } },
        { provide: NotificationService, useValue: { success, error, info } },
        { provide: UserStore, useValue: { id: signal('me') } },
        { provide: SpaceStore, useValue: { selectedSpaceId } },
      ],
    });
    const notifier = TestBed.inject(TaskNotifierService);
    notifier.start();
    TestBed.tick();
    return { notifier, findOne, success, error, info };
  }

  const update = (id = 't1', spaceId = 's1') => streams.get(spaceId)?.next({ spaceId, entity: 'tasks', id, op: 'updated' });

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

  it('says a task the user just started has started', () => {
    const { notifier, info } = setup();
    notifier.watch('s1', task({ kind: TaskKind.TRANSLATION_EXPORT }));
    expect(info).toHaveBeenCalledWith('Translation Export started');
  });

  it('offers to download an export that finished', () => {
    const { success } = setup();
    current = task({ kind: TaskKind.TRANSLATION_EXPORT, file: { name: 'translations.localess.zip', size: 1 } });
    update();
    expect(success.mock.calls[0]).toEqual(['Translation Export finished', { action: expect.objectContaining({ label: 'Download' }) }]);
  });

  it('reads a task the user may not see once, not on every update', () => {
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

  it('listens to the selected space, and follows it to another one', () => {
    setup();
    expect(listeners.get('s1')).toBe(1);
    selectedSpaceId.set('s2');
    TestBed.tick();
    expect(listeners.get('s1')).toBe(0);
    expect(listeners.get('s2')).toBe(1);
  });

  it('keeps listening to the space of a task the user started until it ends, after they moved to another space', () => {
    const { notifier, success } = setup();
    notifier.watch('s1', task());
    selectedSpaceId.set('s2');
    TestBed.tick();
    expect(listeners.get('s1')).toBe(1);
    current = task();
    update('t1', 's1');
    expect(success).toHaveBeenCalledTimes(1);
    TestBed.tick();
    expect(listeners.get('s1')).toBe(0);
  });
});
