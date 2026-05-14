import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { provideIcons } from '@ng-icons/core';
import {
  lucideCheck,
  lucideEllipsisVertical,
  lucideInfo,
  lucideLock,
  lucideMail,
  lucidePencil,
  lucideRefreshCcw,
  lucideSearch,
  lucideTrash,
  lucideUserPlus,
  lucideX,
} from '@ng-icons/lucide';
import { ConfirmationDialogComponent } from '@shared/components/confirmation-dialog/confirmation-dialog.component';
import { ConfirmationDialogModel } from '@shared/components/confirmation-dialog/confirmation-dialog.model';
import { User } from '@shared/models/user.model';
import { NotificationService } from '@shared/services/notification.service';
import { UserService } from '@shared/services/user.service';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { debounceTime } from 'rxjs';
import { filter, switchMap } from 'rxjs/operators';

import { UserDialogComponent } from './user-dialog/user-dialog.component';
import { UserDialogModel } from './user-dialog/user-dialog.model';
import { UserInviteDialogComponent } from './user-invite-dialog/user-invite-dialog.component';
import { UserInviteDialogResponse } from './user-invite-dialog/user-invite-dialog.model';

@Component({
  selector: 'll-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    ReactiveFormsModule,
    HlmButtonImports,
    HlmIconImports,
    HlmTooltipImports,
    HlmProgressImports,
    HlmSpinnerImports,
    HlmDropdownMenuImports,
    HlmFieldImports,
    HlmInputGroupImports,
  ],
  providers: [
    provideIcons({
      lucideUserPlus,
      lucideRefreshCcw,
      lucidePencil,
      lucideTrash,
      lucideCheck,
      lucideX,
      lucideMail,
      lucideEllipsisVertical,
      lucideInfo,
      lucideLock,
      lucideSearch,
    }),
  ],
})
export class UsersComponent implements OnInit {
  private readonly dialog = inject(MatDialog);
  private readonly cd = inject(ChangeDetectorRef);
  private readonly notificationService = inject(NotificationService);
  private readonly userService = inject(UserService);
  private readonly fb = inject(FormBuilder);

  sort = viewChild.required(MatSort);
  paginator = viewChild.required(MatPaginator);

  isLoading = signal(true);
  isSyncLoading = signal(false);
  dataSource: MatTableDataSource<User> = new MatTableDataSource<User>([]);
  displayedColumns: string[] = ['email', 'name', 'active', 'providers', 'role', 'createdAt', 'updatedAt', 'actions'];

  filterForm = this.fb.group({
    search: this.fb.control<string>('', []),
  });

  private destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.loadData();
    this.filterForm.valueChanges.pipe(debounceTime(300)).subscribe({
      next: value => {
        this.dataSource.filter = (value.search ?? '').toLowerCase();
      },
    });
  }

  loadData(): void {
    this.userService
      .findAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: users => {
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

  userFilterPredicate(data: User, filter: string): boolean {
    return data.email?.toLowerCase().includes(filter) || data.displayName?.toLowerCase().includes(filter) || false;
  }

  inviteDialog(): void {
    this.dialog
      .open<UserInviteDialogComponent, void, UserInviteDialogResponse>(UserInviteDialogComponent, {
        panelClass: 'sm',
      })
      .afterClosed()
      .pipe(
        filter(it => it !== undefined),
        switchMap(it => this.userService.invite(it!)),
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

  openEditDialog(element: User): void {
    this.dialog
      .open<UserDialogComponent, UserDialogModel, UserDialogModel>(UserDialogComponent, {
        panelClass: 'sm',
        data: {
          role: element.role,
          permissions: element.permissions,
          lock: element.lock,
        },
      })
      .afterClosed()
      .pipe(
        filter(it => it !== undefined),
        switchMap(it => this.userService.update(element.id, it!)),
      )
      .subscribe({
        next: () => {
          this.notificationService.success('User has been updated.');
        },
        error: error => {
          this.notificationService.error('User can not be updated.');
          console.error(error);
        },
      });
  }

  openDeleteDialog(element: User): void {
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
        },
        error: () => {
          this.notificationService.error(`User '${element.email}' can not be deleted.`);
        },
      });
  }

  sync(): void {
    this.isSyncLoading.set(true);
    this.userService.sync().subscribe({
      next: () => {
        this.notificationService.success(`Sync is in progress, it may take upt to few minutes.`);
      },
      error: () => {
        this.notificationService.error(`Users can not be synced.`);
      },
      complete: () => {
        setTimeout(() => {
          this.isSyncLoading.set(false);
          this.cd.markForCheck();
        }, 1000);
      },
    });
  }
}
