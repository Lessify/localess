import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {MatTableDataSource} from '@angular/material/table';
import {MatDialog} from '@angular/material/dialog';
import {filter, switchMap, takeUntil} from 'rxjs/operators';
import {MatSort} from '@angular/material/sort';
import {MatPaginator} from '@angular/material/paginator';
import {Store} from '@ngrx/store';
import {AppState} from '@core/state/core.state';
import {Space} from '@shared/models/space.model';
import {NotificationService} from '@shared/services/notification.service';
import {combineLatest, Subject} from 'rxjs';
import {TaskService} from "@shared/services/task.service";
import {Task} from "@shared/models/task.model";
import {selectSpace} from "@core/state/space/space.selector";
import {ConfirmationDialogComponent} from "@shared/components/confirmation-dialog/confirmation-dialog.component";
import {ConfirmationDialogModel} from "@shared/components/confirmation-dialog/confirmation-dialog.model";
import {SpaceService} from "@shared/services/space.service";
import {saveAs} from "file-saver-es";

@Component({
  selector: 'll-tasks',
  templateUrl: './tasks.component.html',
  styleUrls: ['./tasks.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TasksComponent implements OnInit, OnDestroy {
  @ViewChild(MatSort, {static: false}) sort?: MatSort;
  @ViewChild(MatPaginator, {static: false}) paginator?: MatPaginator;

  now = Date.now();
  isLoading: boolean = true;
  dataSource: MatTableDataSource<Task> = new MatTableDataSource<Task>([]);
  displayedColumns: string[] = ['id', 'kind', 'status', 'file','description', 'createdAt', 'updatedAt', 'actions'];

  selectedSpace?: Space;

  // Subscriptions
  private destroy$ = new Subject();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly taskService: TaskService,
    private readonly spaceService: SpaceService,
    private readonly dialog: MatDialog,
    private readonly cd: ChangeDetectorRef,
    private readonly notificationService: NotificationService,
    private readonly store: Store<AppState>,
  ) {
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.store.select(selectSpace)
      .pipe(
        filter(it => it.id !== ''), // Skip initial data
        switchMap(it =>
          combineLatest([
            this.spaceService.findById(it.id),
            this.taskService.findAll(it.id)
          ])
        ),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: ([space, tasks]) => {
          this.dataSource = new MatTableDataSource<Task>(tasks);
          this.dataSource.sort = this.sort || null;
          this.dataSource.paginator = this.paginator || null;
          this.selectedSpace = space
          this.isLoading = false;
          this.cd.markForCheck();
        }
      })
  }

  onDownload(element: Task): void {
    this.taskService.download(this.selectedSpace!.id, element.id)
      .subscribe({
        next: (file) => {
          saveAs(file, element.file?.name)
        }
      })
    //window.open(`/api/v1/spaces/${this.selectedSpace!.id}/tasks/${element.id}`)
  }

  openDeleteDialog(element: Task): void {
    this.dialog.open<ConfirmationDialogComponent, ConfirmationDialogModel, boolean>(
      ConfirmationDialogComponent, {
        data: {
          title: 'Delete Task',
          content: `Are you sure about deleting Task with id '${element.id}'.`
        }
      })
      .afterClosed()
      .pipe(
        filter((it) => it || false),
        switchMap(_ =>
          this.taskService.delete(this.selectedSpace!.id, element.id)
        )
      )
      .subscribe({
        next: () => {
          this.notificationService.success(`Task '${element.id}' has been deleted.`);
        },
        error: (err) => {
          this.notificationService.error(`Task '${element.id}' can not be deleted.`);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next(undefined)
    this.destroy$.complete()
  }
}
