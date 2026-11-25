import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TaskService } from '@core/services/task.service';
import { UserStore } from '@core/stores/user.store';
import { Task, TaskKind, TaskProgress, TaskStatus, UserRole } from '@localess/shared';
import { BehaviorSubject, Subject } from 'rxjs';
import { vi } from 'vitest';

import { ActiveTasksComponent } from './active-tasks.component';

const task = (overrides: Partial<Task> = {}): Task =>
  ({
    id: 't1',
    kind: TaskKind.TRANSLATION_IMPORT,
    status: TaskStatus.IN_PROGRESS,
    params: { type: 'translation-full' },
    createdAt: '2026-10-25T10:00:00Z',
    startedAt: '2026-10-25T10:00:05Z',
    updatedAt: '',
    createdBy: { id: 'u1', email: 'editor@example.com', displayName: 'Eddie' },
    ...overrides,
  }) as Task;

describe('ActiveTasksComponent', () => {
  let active: BehaviorSubject<Task[]>;
  let progress: Subject<{ id: string; progress: TaskProgress }>;
  let findActive: ReturnType<typeof vi.fn>;

  function setup(tasks: Task[], role: UserRole = 'EDITOR') {
    active = new BehaviorSubject(tasks);
    progress = new Subject();
    findActive = vi.fn(() => active);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: TaskService, useValue: { findActive, spaceProgress: () => progress } },
        { provide: UserStore, useValue: { role: signal(role) } },
      ],
    });
    const fixture = TestBed.createComponent(ActiveTasksComponent);
    fixture.componentRef.setInput('spaceId', 's1');
    fixture.componentRef.setInput('kinds', [TaskKind.TRANSLATION_IMPORT, TaskKind.TRANSLATION_EXPORT]);
    fixture.detectChanges();
    return fixture;
  }

  const pill = (fixture: ReturnType<typeof setup>) => (fixture.nativeElement as HTMLElement).querySelector('[data-testid="active-tasks"]');

  it('reads the active tasks of its kinds in its space', () => {
    setup([]);
    expect(findActive).toHaveBeenCalledWith('s1', [TaskKind.TRANSLATION_IMPORT, TaskKind.TRANSLATION_EXPORT]);
  });

  it('shows nothing while no task is active', () => {
    expect(pill(setup([]))).toBeNull();
  });

  it('shows a queued task as queued', () => {
    const fixture = setup([task({ status: TaskStatus.QUEUED, startedAt: undefined })]);
    expect(pill(fixture)?.textContent).toContain('Translation Import');
    expect(pill(fixture)?.textContent).toContain('Queued');
  });

  it('shows the running task with the progress the server kept, then the live one', () => {
    const fixture = setup([task({ progress: { step: 'Writing', done: 10, total: 40 } })]);
    expect(pill(fixture)?.textContent).toContain('Writing 10 / 40');
    expect(fixture.componentInstance.current()?.percent).toBe(25);
    progress.next({ id: 't1', progress: { step: 'Writing', done: 30, total: 40 } });
    fixture.detectChanges();
    expect(pill(fixture)?.textContent).toContain('Writing 30 / 40');
  });

  it('shows "Running" until a running task reports progress', () => {
    expect(pill(setup([task()]))?.textContent).toContain('Running');
  });

  it('puts the running task in the pill and counts the queued ones', () => {
    const fixture = setup([
      task({ id: 'q1', status: TaskStatus.QUEUED, kind: TaskKind.TRANSLATION_EXPORT }),
      task({ id: 'r1' }),
      task({ id: 'q2', status: TaskStatus.QUEUED, kind: TaskKind.TRANSLATION_EXPORT }),
    ]);
    expect(fixture.componentInstance.current()?.task.id).toBe('r1');
    expect(pill(fixture)?.textContent).toContain('+2 queued');
  });

  it('goes away when the task ends', () => {
    const fixture = setup([task()]);
    active.next([]);
    fixture.detectChanges();
    expect(pill(fixture)).toBeNull();
  });

  it('warns that an import may overwrite, and tells an export softly', () => {
    const fixture = setup([task(), task({ id: 't2', kind: TaskKind.TRANSLATION_EXPORT, status: TaskStatus.QUEUED })]);
    const [importView, exportView] = fixture.componentInstance.views();
    expect(importView).toMatchObject({
      warning: 'May overwrite translations changed while it runs.',
      readsOnly: false,
      startedBy: 'Eddie',
    });
    expect(exportView).toMatchObject({ warning: 'Changes made now may not be in the exported file.', readsOnly: true });
  });

  it('links a task only for a role that may open its kind', () => {
    expect(setup([task()], 'EDITOR').componentInstance.views()[0].link).toEqual(['/features/spaces', 's1', 'tasks', 't1']);
    TestBed.resetTestingModule();
    expect(setup([task()], 'TRANSLATOR').componentInstance.views()[0].link).toBeUndefined();
  });
});
