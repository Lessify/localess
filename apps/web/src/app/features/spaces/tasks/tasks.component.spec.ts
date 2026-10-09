import { TestBed } from '@angular/core/testing';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { Router } from '@angular/router';
import { Task, TaskKind, TaskStatus } from '@shared/models/task.model';
import { NotificationService } from '@shared/services/notification.service';
import { TaskService } from '@shared/services/task.service';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

vi.mock('file-saver-es', () => ({
  saveAs: vi.fn(),
}));

import { saveAs } from 'file-saver-es';

import { TasksComponent } from './tasks.component';

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 't1',
    kind: TaskKind.ASSET_EXPORT,
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

  function setup(tasks: Task[] = []) {
    const findAll = vi.fn().mockReturnValue(of(tasks));
    const downloadUrl = vi.fn().mockReturnValue(of('https://download-url'));
    const deleteTask = vi.fn().mockReturnValue(of(undefined));
    const navigate = vi.fn();
    const success = vi.fn();
    const error = vi.fn();
    const open = vi.fn();

    TestBed.overrideComponent(TasksComponent, {
      set: { template: '<table llTableSort></table><ll-paginator [length]="0" />' },
    });
    TestBed.configureTestingModule({
      providers: [
        { provide: TaskService, useValue: { findAll, downloadUrl, delete: deleteTask } },
        { provide: NotificationService, useValue: { success, error } },
        { provide: Router, useValue: { navigate } },
        { provide: HlmDialogService, useValue: { open } },
      ],
    });
    const fixture = TestBed.createComponent(TasksComponent);
    fixture.componentRef.setInput('spaceId', 'space-1');
    fixture.detectChanges();
    return { component: fixture.componentInstance, findAll, downloadUrl, deleteTask, navigate, success, error, open };
  }

  it('loads tasks for the space on init', () => {
    const tasks = [task({ id: 't1' }), task({ id: 't2' })];
    const { component, findAll } = setup(tasks);

    expect(findAll).toHaveBeenCalledWith('space-1');
    expect(component.dataSource.filteredData()).toEqual(tasks);
    expect(component.isLoading()).toBe(false);
  });

  it('onFilterChange() serializes the filter value onto the data source', () => {
    const { component } = setup();

    component.onFilterChange({ search: '', kind: ['ASSET_EXPORT'] });

    expect(component.dataSource.filter).toBe(JSON.stringify({ search: '', kind: ['ASSET_EXPORT'] }));
  });

  it('navigateToDetail() navigates to the task detail route', () => {
    const { component, navigate } = setup();

    component.navigateToDetail(task({ id: 't1' }));

    expect(navigate).toHaveBeenCalledWith(['features', 'spaces', 'space-1', 'tasks', 't1']);
  });

  it('onDownload() saves the file under its recorded name', () => {
    const { component, downloadUrl } = setup();
    const exportTask = task({ id: 't1', kind: TaskKind.ASSET_EXPORT, file: { name: 'export.zip', size: 10 } });

    component.onDownload(exportTask as any);

    expect(downloadUrl).toHaveBeenCalledWith('space-1', 't1');
    expect(saveAs).toHaveBeenCalledWith('https://download-url', 'export.zip');
  });

  it('onDownload() falls back to "unknown" when the file has no name', () => {
    const { component } = setup();
    const exportTask = task({ id: 't1', kind: TaskKind.ASSET_EXPORT });

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
