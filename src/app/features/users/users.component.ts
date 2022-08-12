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
import {User} from '../../shared/models/user.model';
import {SpaceDialogComponent} from '../spaces/space-dialog/space-dialog.component';
import {SpaceDialogModel} from '../spaces/space-dialog/space-dialog.model';
import {filter, switchMap} from 'rxjs/operators';
import {UserDialogComponent} from './user-dialog/user-dialog.component';
import {UserDialogModel} from './user-dialog/user-dialog.model';

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
  dataSource: MatTableDataSource<User> = new MatTableDataSource<User>([]);
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
        this.dataSource = new MatTableDataSource<User>(response);
        this.dataSource.sort = this.sort || null;
        this.dataSource.paginator = this.paginator || null;
        this.isLoading = false;
        this.cd.detectChanges();
      }
    )
  }

  editDialog(element: User): void {
    this.dialog.open<UserDialogComponent, UserDialogModel, UserDialogModel>(
      UserDialogComponent, {
        width: '500px',
        data: {
          role: element.role
        }
      })
    .afterClosed()
    .pipe(
      filter(it => it !== undefined),
      switchMap(it =>
        this.userService.update(element.id, it?.role!)
      )
    )
    .subscribe({
        next: (value) => {
          console.log(value)
          this.notificationService.success('User has been updated.');
        },
        error: (err) => {
          console.error(err)
          this.notificationService.error('User can not be updated.');
        }
      }
    );
  }

  invite(): void {

  }
}
