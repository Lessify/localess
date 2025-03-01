import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, input, OnInit, viewChild } from '@angular/core';
import { MatTable, MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { filter, switchMap } from 'rxjs/operators';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { NotificationService } from '@shared/services/notification.service';
import { TaskService } from '@shared/services/task.service';
import { Task } from '@shared/models/task.model';
import { ConfirmationDialogComponent } from '@shared/components/confirmation-dialog/confirmation-dialog.component';
import { ConfirmationDialogModel } from '@shared/components/confirmation-dialog/confirmation-dialog.model';
import { saveAs } from 'file-saver-es';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatToolbar, MatToolbarModule } from '@angular/material/toolbar';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { FormatFileSizePipe } from '@shared/pipes/digital-store.pipe';
import { DatePipe } from '@angular/common';
import { TimeDurationPipe } from '@shared/pipes/time-duration.pipe';
import { MatIconButton } from '@angular/material/button';

@Component({
  selector: 'll-tasks',
  standalone: true,
  templateUrl: './tasks.component.html',
  styleUrls: ['./tasks.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatToolbarModule,
    MatProgressBar,
    MatTableModule,
    MatSortModule,
    MatIcon,
    MatTooltip,
    FormatFileSizePipe,
    DatePipe,
    TimeDurationPipe,
    MatIconButton,
    MatPaginator,
  ],
})
export class TasksComponent implements OnInit {
  sort = viewChild.required(MatSort);
  paginator = viewChild.required(MatPaginator);

  // Input
  spaceId = input.required<string>();

  now = Date.now();
  isLoading = true;
  dataSource: MatTableDataSource<Task> = new MatTableDataSource<Task>([]);
  displayedColumns: string[] = ['id', 'kind', 'status', 'file', 'description', 'updatedAt', 'actions'];

  private destroyRef = inject(DestroyRef);

  constructor(
    private readonly taskService: TaskService,
    private readonly dialog: MatDialog,
    private readonly cd: ChangeDetectorRef,
    private readonly notificationService: NotificationService,
  ) {}

  ngOnInit(): void {
    this.loadData(this.spaceId());
  }

  loadData(spaceId: string): void {
    this.taskService
      .findAll(spaceId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: tasks => {
          this.dataSource = new MatTableDataSource<Task>(tasks);
          this.dataSource.sort = this.sort();
          this.dataSource.paginator = this.paginator();
          this.isLoading = false;
          this.cd.markForCheck();
        },
      });
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
