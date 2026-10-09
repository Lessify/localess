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
import { RouterLink } from '@angular/router';
import { FilterPredicateUtils } from '@core/utils/filter-predicate-utils.service';
import { provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideChevronRight, lucideDownload } from '@ng-icons/lucide';
import { FilterDef, FilterToolbarValue, LlFilterToolbarImports } from '@shared/components/filter-toolbar/filter-toolbar.imports';
import { LlPaginatorImports, Paginator } from '@shared/components/paginator/paginator.imports';
import { LlTableImports, TableDataSource } from '@shared/components/table/table.imports';
import { Task, TaskLog, TaskLogLevel } from '@shared/models/task.model';
import { FormatFileSizePipe } from '@shared/pipes/digital-store.pipe';
import { TaskService } from '@shared/services/task.service';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { saveAs } from 'file-saver-es';

const TASK_KIND_LABELS: Record<string, string> = {
  ASSET_EXPORT: 'Asset Export',
  ASSET_IMPORT: 'Asset Import',
  ASSET_REGEN_METADATA: 'Asset Regeneration Metadata',
  CONTENT_EXPORT: 'Content Export',
  CONTENT_IMPORT: 'Content Import',
  SCHEMA_EXPORT: 'Schema Export',
  SCHEMA_IMPORT: 'Schema Import',
  TRANSLATION_EXPORT: 'Translation Export',
  TRANSLATION_IMPORT: 'Translation Import',
};

const TASK_STATUS_LABELS: Record<string, string> = {
  INITIATED: 'Initiated',
  IN_PROGRESS: 'In Progress',
  ERROR: 'Error',
  FINISHED: 'Finished',
};

@Component({
  selector: 'll-task-detail',
  templateUrl: './task-detail.component.html',
  styleUrls: ['./task-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    LlTableImports,
    LlPaginatorImports,
    LlFilterToolbarImports,
    HlmProgressImports,
    HlmBadgeImports,
    HlmButtonImports,
    HlmIconImports,
    HlmTooltipImports,
    FormatFileSizePipe,
  ],
  providers: [
    provideIcons({
      lucideArrowLeft,
      lucideChevronRight,
      lucideDownload,
    }),
  ],
})
export class TaskDetailComponent implements OnInit, AfterViewInit {
  private readonly taskService = inject(TaskService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);

  spaceId = input.required<string>();
  taskId = input.required<string>();

  paginator = viewChild.required(Paginator);

  isLoading = signal(true);
  isLogsLoading = signal(true);
  task = signal<Task | undefined>(undefined);

  private readonly logs = signal<TaskLog[]>([]);
  readonly dataSource = new TableDataSource<TaskLog>(this.logs, this.injector);
  displayedColumns: string[] = ['expand', 'level', 'message', 'createdAt'];

  expandedLogs = signal<Set<string>>(new Set());

  readonly taskKindLabels = TASK_KIND_LABELS;
  readonly taskStatusLabels = TASK_STATUS_LABELS;
  protected readonly TaskLogLevel = TaskLogLevel;

  readonly filters: FilterDef[] = [
    {
      key: 'level',
      label: 'Level',
      mode: 'multiple',
      options: Object.values(TaskLogLevel).map(level => ({ value: level, label: level })),
    },
  ];

  constructor() {
    this.dataSource.filterPredicate = FilterPredicateUtils.create<TaskLog>({
      searchFields: log => [log.message],
      filterFields: [{ key: 'level', accessor: log => log.level }],
    });
  }

  ngOnInit(): void {
    this.taskService
      .findById(this.spaceId(), this.taskId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(task => {
        this.task.set(task);
        this.isLoading.set(false);
      });

    this.taskService
      .findLogs(this.spaceId(), this.taskId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(logs => {
        this.logs.set(logs);
        this.isLogsLoading.set(false);
      });
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator();
  }

  onFilterChange(value: FilterToolbarValue): void {
    this.dataSource.filter = JSON.stringify(value);
  }

  onDownload(): void {
    const task = this.task();
    if (!task || !('file' in task) || !task.file) return;
    this.taskService.downloadUrl(this.spaceId(), this.taskId()).subscribe({
      next: url => saveAs(url, task.file!.name),
    });
  }

  isLogExpanded(id: string): boolean {
    return this.expandedLogs().has(id);
  }

  toggleLogExpanded(id: string): void {
    const current = new Set(this.expandedLogs());
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    this.expandedLogs.set(current);
  }
}
