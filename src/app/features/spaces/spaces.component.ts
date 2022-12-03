import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component, OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {MatTableDataSource} from '@angular/material/table';
import {MatDialog} from '@angular/material/dialog';
import {filter, switchMap, takeUntil} from 'rxjs/operators';
import {SpaceDialogComponent} from './space-dialog/space-dialog.component';
import {SpaceDialogModel} from './space-dialog/space-dialog.model';
import {MatSort} from '@angular/material/sort';
import {MatPaginator} from '@angular/material/paginator';
import {Store} from '@ngrx/store';
import {AppState} from '../../core/state/core.state';
import {
  ConfirmationDialogComponent
} from '@shared/components/confirmation-dialog/confirmation-dialog.component';
import {
  ConfirmationDialogModel
} from '@shared/components/confirmation-dialog/confirmation-dialog.model';
import {SpaceService} from '@shared/services/space.service';
import {Space} from '@shared/models/space.model';
import {CopierService} from '@shared/services/copier.service';
import {NotificationService} from '@shared/services/notification.service';
import {Subject} from 'rxjs';

@Component({
  selector: 'll-spaces',
  templateUrl: './spaces.component.html',
  styleUrls: ['./spaces.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SpacesComponent implements OnInit, OnDestroy {
  @ViewChild(MatSort, {static: false}) sort?: MatSort;
  @ViewChild(MatPaginator, {static: false}) paginator?: MatPaginator;

  isLoading: boolean = true;
  dataSource: MatTableDataSource<Space> = new MatTableDataSource<Space>([]);
  displayedColumns: string[] = ['id', 'name', 'createdAt', 'updatedAt', 'actions'];

  // Subscriptions
  private destroy$ = new Subject();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly spaceService: SpaceService,
    private readonly dialog: MatDialog,
    private readonly cd: ChangeDetectorRef,
    private readonly notificationService: NotificationService,
    private readonly store: Store<AppState>,
    private readonly copierService: CopierService
  ) {
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.spaceService.findAll()
      .pipe(
        takeUntil(this.destroy$),
      )
      .subscribe(response => {
          this.dataSource = new MatTableDataSource<Space>(response);
          this.dataSource.sort = this.sort || null;
          this.dataSource.paginator = this.paginator || null;
          this.isLoading = false;
          this.cd.markForCheck();
        }
      )
  }

  openAddDialog(): void {
    this.dialog.open<SpaceDialogComponent, SpaceDialogModel, SpaceDialogModel>(
      SpaceDialogComponent, {
        width: '500px',
        data: {
          name: ''
        }
      })
      .afterClosed()
      .pipe(
        filter(it => it !== undefined),
        switchMap(it =>
          this.spaceService.create(it!)
        )
      )
      .subscribe({
        next: (value) => {
          this.notificationService.success('Space has been created.');
        },
        error: (err) => {
          this.notificationService.error('Space can not be created.');
        }
      });
  }

  openEditDialog(element: Space): void {
    this.dialog.open<SpaceDialogComponent, SpaceDialogModel, SpaceDialogModel>(
      SpaceDialogComponent, {
        width: '500px',
        data: {
          name: element.name
        }
      })
      .afterClosed()
      .pipe(
        filter(it => it !== undefined),
        switchMap(it =>
          this.spaceService.update(element.id, it!)
        )
      )
      .subscribe({
        next: () => {
          this.notificationService.success('Space has been updated.');
        },
        error: (err) => {
          this.notificationService.error('Space can not be updated.');
        }
      });
  }

  openDeleteDialog(element: Space): void {
    this.dialog.open<ConfirmationDialogComponent, ConfirmationDialogModel, boolean>(
      ConfirmationDialogComponent, {
        data: {
          title: 'Delete Space',
          content: `Are you sure about deleting Space with name '${element.name}'.`
        }
      })
      .afterClosed()
      .pipe(
        filter((it) => it || false),
        switchMap(_ =>
          this.spaceService.delete(element.id)
        )
      )
      .subscribe({
        next: () => {
          this.notificationService.success(`Space '${element.name}' has been deleted.`);
        },
        error: (err) => {
          this.notificationService.error(`Space '${element.name}' can not be deleted.`);
        }
      });
  }

  copy(value: string): void {
    this.copierService.copyText(value);
  }

  ngOnDestroy(): void {
    this.destroy$.next(undefined)
    this.destroy$.complete()
  }
}
