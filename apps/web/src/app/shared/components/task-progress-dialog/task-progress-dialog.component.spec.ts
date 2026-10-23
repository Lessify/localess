import { DIALOG_DATA } from '@angular/cdk/dialog';
import { TestBed } from '@angular/core/testing';
import { TaskNotifierService } from '@core/services/task-notifier.service';
import { TaskService } from '@core/services/task.service';
import { TaskLogService } from '@core/services/task-log.service';
import { Task, TaskKind, TaskLog, TaskLogLevel, TaskProgress, TaskStatus } from '@localess/shared';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { vi } from 'vitest';

import { TaskProgressDialogComponent } from './task-progress-dialog.component';
import { TaskProgressDialogContext } from './task-progress-dialog.model';

const saveAs = vi.hoisted(() => vi.fn());
vi.mock('file-saver-es', () => ({ saveAs }));

const base = (overrides: Partial<Task> = {}): Task =>
  ({ id: 't1', kind: TaskKind.TRANSLATION_IMPORT, status: TaskStatus.QUEUED, createdAt: '', updatedAt: '', ...overrides }) as Task;

const line = (level: TaskLogLevel, message: string): TaskLog => ({ id: message, level, message, createdAt: '' });

describe('TaskProgressDialogComponent', () => {
  let live: BehaviorSubject<Task>;
  let progress: Subject<TaskProgress>;
  const close = vi.fn();
  const follow = vi.fn();
  const unfollow = vi.fn();

  function setup(task: Task, logs: TaskLog[] = []) {
    live = new BehaviorSubject(task);
    progress = new Subject<TaskProgress>();
    saveAs.mockReset();
    TestBed.configureTestingModule({
      providers: [
        { provide: DIALOG_DATA, useValue: { spaceId: 's1', task, title: 'Translations Import' } satisfies TaskProgressDialogContext },
        { provide: BrnDialogRef, useValue: { close } },
        {
          provide: TaskService,
          useValue: {
            findOne: () => live,
            progress: () => progress,
            downloadUrl: () => of('/api/app/spaces/s1/tasks/t1/download'),
          },
        },
        { provide: TaskLogService, useValue: { findAll: () => of(logs) } },
        { provide: TaskNotifierService, useValue: { follow, unfollow } },
      ],
    });
    const fixture = TestBed.createComponent(TaskProgressDialogComponent);
    fixture.detectChanges();
    return fixture;
  }

  const text = (fixture: ReturnType<typeof setup>) => (fixture.nativeElement as HTMLElement).textContent ?? '';

  it('shows a queued task, and follows it so the notifier stays quiet', () => {
    const fixture = setup(base());
    expect(text(fixture)).toContain('Queued');
    expect(follow).toHaveBeenCalledWith('t1');
  });

  it('shows the step and how far it got, from the progress events', () => {
    const fixture = setup(base({ status: TaskStatus.IN_PROGRESS }));
    expect(text(fixture)).toContain('Running');
    progress.next({ step: 'Writing', done: 4200, total: 10000 });
    fixture.detectChanges();
    expect(text(fixture)).toContain('Writing 4,200 / 10,000');
  });

  it('says Done when an import is finished', () => {
    const fixture = setup(base());
    live.next(base({ status: TaskStatus.FINISHED }));
    fixture.detectChanges();
    expect(text(fixture)).toContain('Done');
  });

  it("tells why it failed, from the task's logs: the error and its problems", () => {
    const fixture = setup(base({ status: TaskStatus.ERROR }), [
      line(TaskLogLevel.INFO, 'reading file'),
      line(TaskLogLevel.ERROR, 'The file has 1 problem.'),
      line(TaskLogLevel.WARN, 'translations[3].key: invalid key'),
    ]);
    expect(text(fixture)).toContain('The file has 1 problem.');
    expect(text(fixture)).toContain('translations[3].key: invalid key');
    expect(text(fixture)).not.toContain('reading file');
  });

  it('downloads a finished export once', () => {
    const fixture = setup(base({ kind: TaskKind.TRANSLATION_EXPORT }));
    const done = base({ kind: TaskKind.TRANSLATION_EXPORT, status: TaskStatus.FINISHED, file: { name: 'site.localess.zip', size: 3 } });
    live.next(done);
    fixture.detectChanges();
    live.next({ ...done });
    fixture.detectChanges();
    expect(saveAs).toHaveBeenCalledTimes(1);
    expect(saveAs).toHaveBeenCalledWith('/api/app/spaces/s1/tasks/t1/download', 'site.localess.zip');
  });

  it('continues in the background: closes, and lets the notifier tell the end', () => {
    const fixture = setup(base());
    fixture.componentInstance.continueInBackground();
    expect(close).toHaveBeenCalled();
    fixture.destroy();
    expect(unfollow).toHaveBeenCalledWith('t1');
  });
});
