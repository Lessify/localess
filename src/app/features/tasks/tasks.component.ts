import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { filter, switchMap } from 'rxjs/operators';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { Store } from '@ngrx/store';
import { AppState } from '@core/state/core.state';
import { Space } from '@shared/models/space.model';
import { NotificationService } from '@shared/services/notification.service';
import { combineLatest } from 'rxjs';
import { TaskService } from '@shared/services/task.service';
import { Task } from '@shared/models/task.model';
import { selectSpace } from '@core/state/space/space.selector';
import { ConfirmationDialogComponent } from '@shared/components/confirmation-dialog/confirmation-dialog.component';
import { ConfirmationDialogModel } from '@shared/components/confirmation-dialog/confirmation-dialog.model';
import { SpaceService } from '@shared/services/space.service';
import { saveAs } from 'file-saver-es';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'll-tasks',
  templateUrl: './tasks.component.html',
  styleUrls: ['./tasks.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TasksComponent implements OnInit {
  @ViewChild(MatSort, { static: false }) sort?: MatSort;
  @ViewChild(MatPaginator, { static: false }) paginator?: MatPaginator;

  now = Date.now();
  isLoading = true;
  dataSource: MatTableDataSource<Task> = new MatTableDataSource<Task>([]);
  displayedColumns: string[] = ['id', 'kind', 'status', 'file', 'description', 'createdAt', 'updatedAt', 'actions'];

  selectedSpace?: Space;

  private destroyRef = inject(DestroyRef);

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly taskService: TaskService,
    private readonly spaceService: SpaceService,
    private readonly dialog: MatDialog,
    private readonly cd: ChangeDetectorRef,
    private readonly notificationService: NotificationService,
    private readonly store: Store<AppState>
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.store
      .select(selectSpace)
      .pipe(
        filter(it => it.id !== ''), // Skip initial data
        switchMap(it => combineLatest([this.spaceService.findById(it.id), this.taskService.findAll(it.id)])),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: ([space, tasks]) => {
          this.dataSource = new MatTableDataSource<Task>(tasks);
          this.dataSource.sort = this.sort || null;
          this.dataSource.paginator = this.paginator || null;
          this.selectedSpace = space;
          this.isLoading = false;
          this.cd.markForCheck();
        },
      });
  }

  onDownload(element: Task): void {
    this.taskService.downloadUrl(this.selectedSpace!.id, element.id).subscribe({
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
        switchMap(() => this.taskService.delete(this.selectedSpace!.id, element.id))
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
