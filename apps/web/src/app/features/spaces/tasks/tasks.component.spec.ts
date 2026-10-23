import { TestBed } from '@angular/core/testing';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { Router } from '@angular/router';
import { signal } from '@angular/core';
import { UserStore } from '@core/stores/user.store';
import { Task, TaskKind, TaskProgress, TaskStatus, UserRole } from '@localess/shared';
import { NotificationService } from '@core/services/notification.service';
import { TaskService } from '@core/services/task.service';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';

vi.mock('file-saver-es', () => ({
  saveAs: vi.fn(),
}));

import { saveAs } from 'file-saver-es';

import { TasksComponent } from './tasks.component';

/** Lets the page's resource take the answer (it resolves through a promise), then runs the effects. */
const settle = async () => {
  TestBed.tick();
  await new Promise(resolve => setTimeout(resolve));
  TestBed.tick();
};

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 't1',
    kind: TaskKind.TRANSLATION_EXPORT,
    status: TaskStatus.FINISHED,
    createdAt: 0 as unknown as Task['createdAt'],
    updatedAt: 0 as unknown as Task['updatedAt'],
    ...overrides,
  } as Task;
}

describe('TasksComponent', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  function setup(tasks: Task[] = [], role: UserRole = 'ADMIN') {
    const findAll = vi.fn().mockReturnValue(of({ items: tasks, page: 0, size: 20, total: tasks.length }));
    const downloadUrl = vi.fn().mockReturnValue(of('https://download-url'));
    const deleteTask = vi.fn().mockReturnValue(of(undefined));
    const navigate = vi.fn();
    const success = vi.fn();
    const error = vi.fn();
    const open = vi.fn();
    const progress = new Subject<{ id: string; progress: TaskProgress }>();

    TestBed.overrideComponent(TasksComponent, {
      set: { template: '<table llTableSort></table><ll-paginator [length]="0" />' },
    });
    TestBed.configureTestingModule({
      providers: [
        { provide: TaskService, useValue: { findAll, downloadUrl, remove: deleteTask, spaceProgress: () => progress } },
        { provide: NotificationService, useValue: { success, error } },
        { provide: Router, useValue: { navigate } },
        { provide: HlmDialogService, useValue: { open } },
        { provide: UserStore, useValue: { role: signal(role) } },
      ],
    });
    const fixture = TestBed.createComponent(TasksComponent);
    fixture.componentRef.setInput('spaceId', 'space-1');
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, findAll, downloadUrl, deleteTask, navigate, success, error, open, progress };
  }

  it('loads the first page of the space tasks on init, newest first (the server default)', async () => {
    const tasks = [task({ id: 't1' }), task({ id: 't2' })];
    const { component, findAll } = setup(tasks);
    await settle();

    expect(findAll).toHaveBeenCalledTimes(1);
    expect(findAll.mock.calls[0][0]).toBe('space-1');
    expect(findAll.mock.calls[0][1].toString()).toBe('page=0&size=20');
    expect(component.dataSource.filteredData()).toEqual(tasks);
    expect(component.page.total()).toBe(2);
    expect(component.page.loading()).toBe(false);
  });

  it('the Kind filter offers only the kinds the role may start', () => {
    const kinds = (role: UserRole) => setup([], role).component.filters[0].options.map(it => it.value);
    expect(kinds('TRANSLATOR')).toEqual(['TRANSLATION_TRANSLATE']);
    TestBed.resetTestingModule();
    expect(kinds('EDITOR')).toEqual(['TRANSLATION_EXPORT', 'TRANSLATION_IMPORT', 'TRANSLATION_TRANSLATE']);
    TestBed.resetTestingModule();
    expect(kinds('DEVELOPER')).toEqual([
      'SCHEMA_EXPORT',
      'SCHEMA_IMPORT',
      'TRANSLATION_EXPORT',
      'TRANSLATION_IMPORT',
      'TRANSLATION_TRANSLATE',
    ]);
  });

  it("shows a running task's progress from the space's progress events", () => {
    const { component, progress } = setup();
    progress.next({ id: 't1', progress: { step: 'Writing', done: 3, total: 10 } });
    expect(component.progressText(task({ id: 't1', status: TaskStatus.IN_PROGRESS }))).toBe('Writing 3 / 10');
    expect(component.progressText(task({ id: 't2', status: TaskStatus.IN_PROGRESS }))).toBeUndefined();
  });

  it('names the download by kind', () => {
    const { component } = setup();
    expect(component.downloadLabel(task({ kind: TaskKind.TRANSLATION_EXPORT }))).toBe('Download export');
    expect(component.downloadLabel(task({ kind: TaskKind.TRANSLATION_IMPORT }))).toBe('Download uploaded file');
  });

  it('downloads only a finished task with a file', () => {
    const { component } = setup();
    expect(component.canDownload(task({ status: TaskStatus.FINISHED, file: { name: 'a.zip', size: 1 } }))).toBe(true);
    expect(component.canDownload(task({ status: TaskStatus.ERROR, file: { name: 'a.zip', size: 1 } }))).toBe(false);
    expect(component.canDownload(task({ status: TaskStatus.FINISHED }))).toBe(false);
  });

  it('onFilterChange() asks the server for the search, kinds and statuses, from the first page', () => {
    const { fixture, component, findAll } = setup();
    component.list.page.set(2);

    component.onFilterChange({ search: ' backup ', kind: ['SCHEMA_EXPORT', 'TRANSLATION_EXPORT'], status: [] });
    fixture.detectChanges();

    expect(findAll.mock.lastCall![1].toString()).toBe('page=0&size=20&search=backup&kind=SCHEMA_EXPORT&kind=TRANSLATION_EXPORT');
  });

  it('onSortChange() asks for the creation time in the direction chosen', () => {
    const { fixture, component, findAll } = setup();

    component.onSortChange({ active: 'createdAt', direction: 'asc' });
    fixture.detectChanges();

    expect(findAll.mock.lastCall![1].toString()).toBe('page=0&size=20&sort=createdAt&direction=asc');
  });

  it('tells a failed load, and loads again on the next query change', async () => {
    const { fixture, component, findAll, error } = setup();
    await settle();
    findAll.mockReturnValueOnce(throwError(() => new Error('boom')));

    component.list.page.set(1);
    await settle();
    expect(error).toHaveBeenCalledWith('Tasks can not be loaded.');

    component.list.page.set(0);
    await settle();
    expect(findAll).toHaveBeenCalledTimes(3);
  });

  it('navigateToDetail() navigates to the task detail route', () => {
    const { component, navigate } = setup();

    component.navigateToDetail(task({ id: 't1' }));

    expect(navigate).toHaveBeenCalledWith(['features', 'spaces', 'space-1', 'tasks', 't1']);
  });

  it('onDownload() saves the file under its recorded name', () => {
    const { component, downloadUrl } = setup();
    const exportTask = task({ id: 't1', kind: TaskKind.TRANSLATION_EXPORT, file: { name: 'export.zip', size: 10 } });

    component.onDownload(exportTask as any);

    expect(downloadUrl).toHaveBeenCalledWith('space-1', 't1');
    expect(saveAs).toHaveBeenCalledWith('https://download-url', 'export.zip');
  });

  it('onDownload() falls back to "unknown" when the file has no name', () => {
    const { component } = setup();
    const exportTask = task({ id: 't1', kind: TaskKind.TRANSLATION_EXPORT });

    component.onDownload(exportTask as any);

    expect(saveAs).toHaveBeenCalledWith('https://download-url', 'unknown');
  });

  it('openDeleteDialog() deletes and notifies success when confirmed', () => {
    const { component, open, deleteTask, success } = setup();
    open.mockReturnValue({ closed$: of(true) });

    component.openDeleteDialog(task({ id: 't1' }));

    expect(deleteTask).toHaveBeenCalledWith('space-1', 't1');
    expect(success).toHaveBeenCalledWith("Task 't1' has been deleted.");
  });

  it('openDeleteDialog() does not delete when cancelled', () => {
    const { component, open, deleteTask } = setup();
    open.mockReturnValue({ closed$: of(undefined) });

    component.openDeleteDialog(task({ id: 't1' }));

    expect(deleteTask).not.toHaveBeenCalled();
  });

  it('openDeleteDialog() notifies an error when deletion fails', () => {
    const { component, open, deleteTask, error } = setup();
    open.mockReturnValue({ closed$: of(true) });
    deleteTask.mockReturnValue(throwError(() => new Error('boom')));

    component.openDeleteDialog(task({ id: 't1' }));

    expect(error).toHaveBeenCalledWith("Task 't1' can not be deleted.");
  });
});
