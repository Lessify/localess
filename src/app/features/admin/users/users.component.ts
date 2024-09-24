import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
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
  sort = viewChild.required(MatSort);
  paginator = viewChild.required(MatPaginator);

  isLoading = signal(true);
  dataSource: MatTableDataSource<User> = new MatTableDataSource<User>([]);
  displayedColumns: string[] = ['email', 'name', 'active', 'providers', 'role', 'creationTime', 'lastSignInTime', 'actions'];

  private destroyRef = inject(DestroyRef);

  constructor(
    private readonly dialog: MatDialog,
    private readonly cd: ChangeDetectorRef,
    private readonly notificationService: NotificationService,
    private readonly userService: UserService,
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.userService
      .findAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: users => {
          console.log(users);
          this.dataSource.data = users;
          this.dataSource.filterPredicate = this.userFilterPredicate;
          this.dataSource.sort = this.sort();
          this.dataSource.paginator = this.paginator();
          this.isLoading.set(false);
          this.cd.markForCheck();
        },
        error: () => {
          this.notificationService.error('Users can not be loaded.');
          this.isLoading.set(false);
          this.cd.markForCheck();
        },
      });
  }

  applyFilter(event: KeyboardEvent) {
    this.dataSource.filter = (event.target as HTMLInputElement).value.toLowerCase();
  }

  userFilterPredicate(data: User, filter: string): boolean {
    console.log(data, filter);
    return data.email?.toLowerCase().includes(filter) || data.displayName?.toLowerCase().includes(filter) || false;
  }

  inviteDialog(): void {
    this.dialog
      .open<UserInviteDialogComponent, void, UserInviteDialogResponse>(UserInviteDialogComponent, {
        width: '500px',
      })
      .afterClosed()
      .pipe(
        filter(it => it !== undefined),
        switchMap(it => this.userService.invite(it!)),
      )
      .subscribe({
        next: () => {
          this.notificationService.success('User has been invited.');
          this.loadData();
        },
        error: () => {
          this.notificationService.error('User can not be invited.');
          this.loadData();
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
        switchMap(it => this.userService.update({ id: element.id, role: it?.role, permissions: it?.permissions })),
      )
      .subscribe({
        next: () => {
          this.notificationService.success('User has been updated.');
          this.loadData();
        },
        error: () => {
          this.notificationService.error('User can not be updated.');
          this.loadData();
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
        switchMap(() => this.userService.delete(element.id)),
      )
      .subscribe({
        next: () => {
          this.notificationService.success(`User '${element.email}' has been deleted.`);
          this.loadData();
        },
        error: () => {
          this.notificationService.error(`User '${element.email}' can not be deleted.`);
          this.loadData();
        },
      });
  }
}
