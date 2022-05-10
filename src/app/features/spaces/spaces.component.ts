import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  ViewChild
} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {MatTableDataSource} from '@angular/material/table';
import {MatDialog} from '@angular/material/dialog';
import {filter, switchMap} from 'rxjs/operators';
import {SpaceDialogComponent} from './space-dialog/space-dialog.component';
import {SpaceDialogModel} from './space-dialog/space-dialog.model';
import {MatSort} from '@angular/material/sort';
import {MatPaginator} from '@angular/material/paginator';
import {Store} from '@ngrx/store';
import {Space} from './spaces.model';
import {SpacesService} from './spaces.service';
import {NotificationService} from '../../core/notifications/notification.service';
import {AppState} from '../../core/state/core.state';
import {
  ConfirmationDialogComponent
} from '../../shared/components/confirmation-dialog/confirmation-dialog.component';
import {
  ConfirmationDialogModel
} from '../../shared/components/confirmation-dialog/confirmation-dialog.model';

@Component({
  selector: 'll-spaces',
  templateUrl: './spaces.component.html',
  styleUrls: ['./spaces.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SpacesComponent implements OnInit {
  @ViewChild(MatSort, {static: false}) sort?: MatSort;
  @ViewChild(MatPaginator, {static: false}) paginator?: MatPaginator;

  isLoading: boolean = true;
  dataSource: MatTableDataSource<Space> = new MatTableDataSource<Space>([]);
  displayedColumns: string[] = ['name', 'actions'];


  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly spacesService: SpacesService,
    private readonly dialog: MatDialog,
    private readonly cd: ChangeDetectorRef,
    private readonly notificationService: NotificationService,
    private readonly store: Store<AppState>
  ) {
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.spacesService.findAll()
    .subscribe(response => {
        this.dataSource = new MatTableDataSource<Space>(response);
        this.dataSource.sort = this.sort || null;
        this.dataSource.paginator = this.paginator || null;
        this.isLoading = false;
        this.cd.detectChanges();
      }
    )
  }

  addDialog(): void {
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
        this.spacesService.create(it!)
      )
    )
    .subscribe({
        next: (value) => {
          console.log(value)
          //this.dataSource.data.unshift(value);
          //this.dataSource._updateChangeSubscription();
          this.notificationService.success('Space has been created.');
        },
        error: (err) => {
          console.log(err)
          this.notificationService.error('Environment can not be created.');
        }
      }
    );
  }

  editDialog(element: Space): void {
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
        this.spacesService.update(element.id, it!)
      )
    )
    .subscribe({
        next: (value) => {
          console.log(value)
          //this.dataSource.data.unshift(value);
          //this.dataSource._updateChangeSubscription();
          this.notificationService.success('Space has been updated.');
        },
        error: () => {
          this.notificationService.error('Environment can not be updated.');
        }
      }
    );
  }

  deleteDialog(element: Space): void {
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
        this.spacesService.delete(element.id)
      )
    )
    .subscribe({
      next: () => {
        const idx: number = this.dataSource.data.findIndex(
          x => x.id === element.id
        );
        if (idx !== -1) {
          this.dataSource.data.splice(idx, 1);
          this.dataSource._updateChangeSubscription();
        }
        this.notificationService.success(`Space '${element.name}' has been deleted.`);
      },
      error: () => {
        this.notificationService.error(`Space '${element.name}' can not be deleted.`);
      }
    });
  }
}
