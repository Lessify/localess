import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, Injector, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NotificationService } from '@core/services/notification.service';
import { TaskService } from '@core/services/task.service';
import { UserStore } from '@core/stores/user.store';
import { PagedList } from '@core/utils/paged-list';
import { pagedResource } from '@core/utils/paged-resource';
import { isTaskExport, Task, TaskKind, taskKindsFor, TaskProgress, TaskStatus } from '@localess/shared';
import { provideIcons } from '@ng-icons/core';
import {
  lucideCheck,
  lucideCircleEllipsis,
  lucideDownload,
  lucideEllipsisVertical,
  lucideOctagonAlert,
  lucideTrash,
} from '@ng-icons/lucide';
import {
  CONFIRMATION_DIALOG_CONTENT_CLASS,
  ConfirmationDialogComponent,
  ConfirmationDialogContext,
  ConfirmationDialogResult,
} from '@shared/components/confirmation-dialog';
import { FilterDef, FilterToolbarValue, LlFilterToolbarImports } from '@shared/components/filter-toolbar/filter-toolbar.imports';
import { LlPaginatorImports } from '@shared/components/paginator/paginator.imports';
import { LlTableImports, TableDataSource, TableSortState } from '@shared/components/table/table.imports';
import { formatTaskParams, formatTaskProgress, TASK_KIND_LABELS, taskDurations } from '@shared/models/task.model';
import { FormatFileSizePipe } from '@shared/pipes/digital-store.pipe';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { saveAs } from 'file-saver-es';
import { filter, switchMap, take } from 'rxjs/operators';

const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  [TaskStatus.QUEUED]: 'Queued',
  [TaskStatus.IN_PROGRESS]: 'In Progress',
  [TaskStatus.ERROR]: 'Error',
  [TaskStatus.FINISHED]: 'Finished',
};

@Component({
  selector: 'll-tasks',
  templateUrl: './tasks.component.html',
  styleUrls: ['./tasks.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    LlTableImports,
    LlPaginatorImports,
    LlFilterToolbarImports,
    FormatFileSizePipe,
    CommonModule,
    HlmProgressImports,
    HlmButtonImports,
    HlmTooltipImports,
    HlmIconImports,
    HlmSpinnerImports,
    HlmDropdownMenuImports,
  ],
  providers: [
    provideIcons({
      lucideEllipsisVertical,
      lucideDownload,
      lucideTrash,
      lucideOctagonAlert,
      lucideCheck,
      lucideCircleEllipsis,
    }),
  ],
})
export class TasksComponent {
  private readonly taskService = inject(TaskService);
  private readonly dialog = inject(HlmDialogService);
  private readonly notificationService = inject(NotificationService);
  private readonly injector = inject(Injector);
  private readonly router = inject(Router);
  private readonly userStore = inject(UserStore);

  // Input
  spaceId = input.required<string>();

  displayedColumns: string[] = ['id', 'kind', 'status', 'file', 'description', 'createdBy', 'createdAt', 'actions'];

  /** The query: paged and filtered on the server, newest first unless sorted otherwise. */
  readonly list = new PagedList(20);
  /** The page shown, live: a change of any task of the space reads it again. */
  readonly page = pagedResource({
    list: this.list,
    load: params => this.taskService.findAll(this.spaceId(), params),
    error: 'Tasks can not be loaded.',
  });
  readonly dataSource = new TableDataSource<Task>(this.page.items, this.injector);

  readonly filters: FilterDef[] = [
    {
      key: 'kind',
      label: 'Kind',
      mode: 'multiple',
      // The kinds the user's role may start: the only ones the server lists for them.
      options: taskKindsFor({ role: this.userStore.role() }).map(kind => ({ value: kind, label: TASK_KIND_LABELS[kind] })),
    },
    {
      key: 'status',
      label: 'Status',
      mode: 'multiple',
      options: Object.values(TaskStatus).map(status => ({ value: status, label: TASK_STATUS_LABELS[status] })),
    },
  ];

  /** The search box (id, file name, message) and the Kind and Status filters, on the server; from the first page. */
  onFilterChange(value: FilterToolbarValue): void {
    this.list.setFilters({ search: value.search?.trim() || undefined, kind: value['kind'], status: value['status'] });
  }

  onSortChange(sort: TableSortState): void {
    this.list.setSort(sort.active, sort.direction);
  }

  navigateToDetail(task: Task): void {
    this.router.navigate(['features', 'spaces', this.spaceId(), 'tasks', task.id]);
  }

  readonly kindLabel = (kind: TaskKind): string => TASK_KIND_LABELS[kind];
  readonly durations = taskDurations;

  /** The running tasks' progress, by id, from the space's progress events (never stored). */
  private readonly progress = signal<Record<string, TaskProgress>>({});

  constructor() {
    effect(onCleanup => {
      const subscription = this.taskService
        .spaceProgress(this.spaceId())
        .subscribe(({ id, progress }) => this.progress.update(all => ({ ...all, [id]: progress })));
      onCleanup(() => subscription.unsubscribe());
    });
  }

  /** "Writing 3 / 10" for a running task with progress; nothing otherwise. */
  progressText(task: Task): string | undefined {
    const progress = this.progress()[task.id];
    return task.status === TaskStatus.IN_PROGRESS && progress ? formatTaskProgress(progress) : undefined;
  }

  /** What the file is: an export's result, or an import's upload. */
  downloadLabel(task: Task): string {
    return isTaskExport(task) ? 'Download export' : 'Download uploaded file';
  }

  /** An export's file once it finished; an import's upload whatever its status. */
  canDownload(task: Task): boolean {
    return !!task.file && (!isTaskExport(task) || task.status === TaskStatus.FINISHED);
  }

  /** A task's input, as text: "Locale de (key-value JSON)", "en → de (overwrite)". */
  paramsText(task: Task): string | undefined {
    return formatTaskParams('params' in task ? task.params : undefined);
  }

  onDownload(element: Task): void {
    this.taskService.downloadUrl(this.spaceId(), element.id).subscribe({
      next: url => {
        saveAs(url, element.file?.name || 'unknown');
      },
    });
  }

  openDeleteDialog(element: Task): void {
    this.dialog
      .open<ConfirmationDialogResult, ConfirmationDialogContext>(ConfirmationDialogComponent, {
        context: {
          title: 'Delete Task',
          content: `Are you sure about deleting Task with id '${element.id}'.`,
          variant: 'destructive',
        },
        contentClass: CONFIRMATION_DIALOG_CONTENT_CLASS,
      })
      .closed$.pipe(
        take(1),
        filter(it => it || false),
        switchMap(() => this.taskService.remove(this.spaceId(), element.id)),
      )
      .subscribe({
        next: () => {
          this.notificationService.success(`Task '${element.id}' has been deleted.`);
        },
        error: (err: unknown) => {
          console.error(err);
          this.notificationService.error(`Task '${element.id}' can not be deleted.`);
        },
      });
  }
}
