import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { Store } from '@ngrx/store';
import { AppState } from '@core/state/core.state';
import { UserService } from '@shared/services/user.service';
import { User } from '@shared/models/user.model';
import { filter, switchMap } from 'rxjs/operators';
import { UserDialogComponent } from './user-dialog/user-dialog.component';
import { UserDialogModel } from './user-dialog/user-dialog.model';
import { UserInviteDialogComponent } from './user-invite-dialog/user-invite-dialog.component';
import { UserInviteDialogResponse } from './user-invite-dialog/user-invite-dialog.model';
import { ConfirmationDialogComponent } from '@shared/components/confirmation-dialog/confirmation-dialog.component';
import { ConfirmationDialogModel } from '@shared/components/confirmation-dialog/confirmation-dialog.model';
import { NotificationService } from '@shared/services/notification.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'll-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersComponent implements OnInit {
  @ViewChild(MatSort, { static: false }) sort?: MatSort;
  @ViewChild(MatPaginator, { static: false }) paginator?: MatPaginator;

  isLoading = true;
  isSyncLoading = false;
  dataSource: MatTableDataSource<User> = new MatTableDataSource<User>([]);
  displayedColumns: string[] = ['avatar', 'email', 'name', 'role', 'createdAt', 'updatedAt', 'actions'];

  private destroyRef = inject(DestroyRef);

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly dialog: MatDialog,
    private readonly cd: ChangeDetectorRef,
    private readonly notificationService: NotificationService,
    private readonly store: Store<AppState>,
    private readonly userService: UserService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.userService
      .findAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(response => {
        this.dataSource = new MatTableDataSource<User>(response);
        this.dataSource.sort = this.sort || null;
        this.dataSource.paginator = this.paginator || null;
        this.isLoading = false;
        this.cd.markForCheck();
      });
  }

  inviteDialog(): void {
    this.dialog
      .open<UserInviteDialogComponent, void, UserInviteDialogResponse>(UserInviteDialogComponent, {
        width: '500px',
      })
      .afterClosed()
      .pipe(
        filter(it => it !== undefined),
        switchMap(it => this.userService.invite(it!))
      )
      .subscribe({
        next: () => {
          this.notificationService.success('User has been invited.');
        },
        error: () => {
          this.notificationService.error('User can not be invited.');
        },
      });
  }

  editDialog(element: User): void {
    this.dialog
      .open<UserDialogComponent, UserDialogModel, UserDialogModel>(UserDialogComponent, {
        width: '500px',
        data: {
          role: element.role,
          permissions: element.permissions,
        },
      })
      .afterClosed()
      .pipe(
        filter(it => it !== undefined),
        switchMap(it => this.userService.update(element.id, it?.role, it?.permissions))
      )
      .subscribe({
        next: () => {
          this.notificationService.success('User has been updated.');
        },
        error: () => {
          this.notificationService.error('User can not be updated.');
        },
      });
  }

  deleteDialog(element: User): void {
    this.dialog
      .open<ConfirmationDialogComponent, ConfirmationDialogModel, boolean>(ConfirmationDialogComponent, {
        data: {
          title: 'Delete User',
          content: `Are you sure about deleting User with email '${element.email}'.`,
        },
      })
      .afterClosed()
      .pipe(
        filter(it => it || false),
        switchMap(() => this.userService.delete(element.id))
      )
      .subscribe({
        next: () => {
          this.notificationService.success(`User '${element.email}' has been deleted.`);
        },
        error: () => {
          this.notificationService.error(`User '${element.email}' can not be deleted.`);
        },
      });
  }

  sync(): void {
    this.isSyncLoading = true;
    this.userService.sync().subscribe({
      next: () => {
        this.notificationService.success(`Sync is in progress, it may take upt to few minutes.`);
      },
      error: () => {
        this.notificationService.error(`Users can not be synced.`);
      },
      complete: () => {
        setTimeout(() => {
          this.isSyncLoading = false;
          this.cd.markForCheck();
        }, 1000);
      },
    });
  }
}
