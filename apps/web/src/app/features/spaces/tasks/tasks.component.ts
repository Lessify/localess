import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, Injector, input, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { NotificationService } from '@core/services/notification.service';
import { TaskService } from '@core/services/task.service';
import { PagedList } from '@core/utils/paged-list';
import { Task, TaskExport, TaskImport, TaskKind, TaskStatus } from '@localess/shared';
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
import { FormatFileSizePipe } from '@shared/pipes/digital-store.pipe';
import { TimeBetweenPipe } from '@shared/pipes/time-duration.pipe';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { saveAs } from 'file-saver-es';
import { EMPTY } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';

const TASK_KIND_LABELS: Record<TaskKind, string> = {
  [TaskKind.ASSET_EXPORT]: 'Asset Export',
  [TaskKind.ASSET_IMPORT]: 'Asset Import',
  [TaskKind.ASSET_REGEN_METADATA]: 'Asset Regeneration Metadata',
  [TaskKind.CONTENT_EXPORT]: 'Content Export',
  [TaskKind.CONTENT_IMPORT]: 'Content Import',
  [TaskKind.SCHEMA_EXPORT]: 'Schema Export',
  [TaskKind.SCHEMA_IMPORT]: 'Schema Import',
  [TaskKind.TRANSLATION_EXPORT]: 'Translation Export',
  [TaskKind.TRANSLATION_IMPORT]: 'Translation Import',
};

const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  [TaskStatus.INITIATED]: 'Initiated',
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
    TimeBetweenPipe,
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
export class TasksComponent implements OnInit {
  private readonly taskService = inject(TaskService);
  private readonly dialog = inject(HlmDialogService);
  private readonly notificationService = inject(NotificationService);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  // Input
  spaceId = input.required<string>();

  isLoading = signal(true);
  displayedColumns: string[] = ['id', 'kind', 'status', 'file', 'description', 'createdAt', 'actions'];

  /** The page shown: paged and filtered on the server, newest first unless sorted otherwise. */
  readonly list = new PagedList(20);
  readonly total = signal(0);
  private readonly tasks = signal<Task[]>([]);
  readonly dataSource = new TableDataSource<Task>(this.tasks, this.injector);

  readonly filters: FilterDef[] = [
    {
      key: 'kind',
      label: 'Kind',
      mode: 'multiple',
      options: Object.values(TaskKind).map(kind => ({ value: kind, label: TASK_KIND_LABELS[kind] })),
    },
    {
      key: 'status',
      label: 'Status',
      mode: 'multiple',
      options: Object.values(TaskStatus).map(status => ({ value: status, label: TASK_STATUS_LABELS[status] })),
    },
  ];

  ngOnInit(): void {
    this.loadData(this.spaceId());
  }

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

  /**
   * The current query's page, again whenever the query changes or a task does (live). A failed load is told and ends
   * only that request: the next query change (page, sort, filters) fetches again.
   */
  loadData(spaceId: string): void {
    toObservable(this.list.params, { injector: this.injector })
      .pipe(
        switchMap(params =>
          this.taskService.findPage(spaceId, params).pipe(
            catchError(() => {
              this.notificationService.error('Tasks can not be loaded.');
              this.isLoading.set(false);
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(page => {
        this.tasks.set(page.items);
        this.total.set(page.total);
        this.list.onLoaded(page);
        this.isLoading.set(false);
      });
  }

  onDownload(element: TaskExport | TaskImport): void {
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
        switchMap(() => this.taskService.delete(this.spaceId(), element.id)),
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
