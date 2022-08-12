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
import {MatSort} from '@angular/material/sort';
import {MatPaginator} from '@angular/material/paginator';
import {Store} from '@ngrx/store';
import {NotificationService} from '../../core/notifications/notification.service';
import {AppState} from '../../core/state/core.state';
import {Space} from '../../shared/models/space.model';
import {Locale} from '../../shared/models/locale.model';
import {UserService} from '../../shared/services/user.service';
import {UserRecord} from '../../shared/models/user.model';

@Component({
  selector: 'll-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UsersComponent implements OnInit {
  @ViewChild(MatSort, {static: false}) sort?: MatSort;
  @ViewChild(MatPaginator, {static: false}) paginator?: MatPaginator;

  isLoading: boolean = true;
  selectedSpace?: Space;
  dataSource: MatTableDataSource<UserRecord> = new MatTableDataSource<UserRecord>([]);
  displayedColumns: string[] = ['email', 'name', 'role', 'actions'];


  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly dialog: MatDialog,
    private readonly cd: ChangeDetectorRef,
    private readonly notificationService: NotificationService,
    private readonly store: Store<AppState>,
    private readonly userService: UserService
  ) {
  }

  ngOnInit(): void {
    this.loadData()
  }

  loadData(): void {
    this.userService.findAll()
    .subscribe(response => {
        this.dataSource = new MatTableDataSource<UserRecord>(response.users);
        this.dataSource.sort = this.sort || null;
        this.dataSource.paginator = this.paginator || null;
        this.isLoading = false;
        this.cd.detectChanges();
      }
    )
  }

  deleteDialog(element: Locale): void {
    // if (this.selectedSpace) {
    //   const spaceId = this.selectedSpace.id
    //   this.dialog.open<ConfirmationDialogComponent, ConfirmationDialogModel, boolean>(
    //     ConfirmationDialogComponent, {
    //       data: {
    //         title: 'Delete Locale',
    //         content: `Are you sure about deleting Locale with name '${element.name}'.`
    //       }
    //     })
    //   .afterClosed()
    //   .pipe(
    //     filter((it) => it || false),
    //     switchMap(_ =>
    //       this.localeService.delete(spaceId, element)
    //     )
    //   )
    //   .subscribe({
    //     next: () => {
    //       const idx: number = this.dataSource.data.findIndex(
    //         x => x.id === element.id
    //       );
    //       if (idx !== -1) {
    //         this.dataSource.data.splice(idx, 1);
    //         this.dataSource._updateChangeSubscription();
    //       }
    //       this.notificationService.success(`Locale '${element.name}' has been deleted.`);
    //     },
    //     error: () => {
    //       this.notificationService.error(`Locale '${element.name}' can not be deleted.`);
    //     }
    //   });
    // }

  }

  invite(): void {

  }
}
