import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  Injector,
  input,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { FilterPredicateUtils } from '@core/utils/filter-predicate-utils.service';
import { provideIcons } from '@ng-icons/core';
import {
  lucideCheck,
  lucideCircleEllipsis,
  lucideDownload,
  lucideEllipsisVertical,
  lucideOctagonAlert,
  lucideTrash,
} from '@ng-icons/lucide';
import { ConfirmationDialogComponent, ConfirmationDialogModel } from '@shared/components/confirmation-dialog';
import { FilterDef, FilterToolbarValue, LlFilterToolbarImports } from '@shared/components/filter-toolbar/filter-toolbar.imports';
import { LlPaginatorImports, Paginator } from '@shared/components/paginator/paginator.imports';
import { LlTableImports, TableDataSource, TableSort } from '@shared/components/table/table.imports';
import { Task, TaskExport, TaskImport, TaskKind, TaskStatus } from '@shared/models/task.model';
import { FormatFileSizePipe } from '@shared/pipes/digital-store.pipe';
import { TimeDurationPipe } from '@shared/pipes/time-duration.pipe';
import { NotificationService } from '@shared/services/notification.service';
import { TaskService } from '@shared/services/task.service';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { saveAs } from 'file-saver-es';
import { filter, switchMap } from 'rxjs/operators';

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
    TimeDurationPipe,
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
export class TasksComponent implements OnInit, AfterViewInit {
  private readonly taskService = inject(TaskService);
  private readonly dialog = inject(MatDialog);
  private readonly notificationService = inject(NotificationService);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);

  readonly sort = viewChild.required(TableSort);
  readonly paginator = viewChild.required(Paginator);

  // Input
  spaceId = input.required<string>();

  now = Date.now();
  isLoading = signal(true);
  displayedColumns: string[] = ['id', 'kind', 'status', 'file', 'description', 'createdAt', 'actions'];

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

  constructor() {
    this.dataSource.filterPredicate = FilterPredicateUtils.create<Task>({
      searchFields: task => [task.id, 'file' in task ? task.file?.name : undefined, task.message],
      filterFields: [
        { key: 'kind', accessor: task => task.kind },
        { key: 'status', accessor: task => task.status },
      ],
    });
  }

  ngOnInit(): void {
    this.loadData(this.spaceId());
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort();
    this.dataSource.paginator = this.paginator();
  }

  onFilterChange(value: FilterToolbarValue): void {
    this.dataSource.filter = JSON.stringify(value);
  }

  loadData(spaceId: string): void {
    this.taskService
      .findAll(spaceId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: tasks => {
          this.tasks.set(tasks);
          this.isLoading.set(false);
        },
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
      .open<ConfirmationDialogComponent, ConfirmationDialogModel, boolean>(ConfirmationDialogComponent, {
        data: {
          title: 'Delete Task',
          content: `Are you sure about deleting Task with id '${element.id}'.`,
        },
      })
      .afterClosed()
      .pipe(
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
