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
import { LlPaginatorImports, Paginator } from '@shared/components/paginator/paginator.imports';
import { LlTableImports, TableDataSource, TableSort } from '@shared/components/table/table.imports';
import { Task, TaskExport, TaskImport } from '@shared/models/task.model';
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

@Component({
  selector: 'll-tasks',
  templateUrl: './tasks.component.html',
  styleUrls: ['./tasks.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    LlTableImports,
    LlPaginatorImports,
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

  ngOnInit(): void {
    this.loadData(this.spaceId());
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort();
    this.dataSource.paginator = this.paginator();
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
