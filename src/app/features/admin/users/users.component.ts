import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  Injector,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { FilterPredicateUtils } from '@core/utils/filter-predicate-utils.service';
import { provideIcons } from '@ng-icons/core';
import {
  lucideCheck,
  lucideEllipsisVertical,
  lucideInfo,
  lucideLock,
  lucideMail,
  lucidePencil,
  lucideRefreshCcw,
  lucideShieldCheck,
  lucideTrash,
  lucideUserPlus,
  lucideX,
} from '@ng-icons/lucide';
import { ConfirmationDialogComponent } from '@shared/components/confirmation-dialog/confirmation-dialog.component';
import { ConfirmationDialogModel } from '@shared/components/confirmation-dialog/confirmation-dialog.model';
import { FilterDef, FilterToolbarValue, LlFilterToolbarImports } from '@shared/components/filter-toolbar/filter-toolbar.imports';
import { LlPaginatorImports, Paginator } from '@shared/components/paginator/paginator.imports';
import { LlTableImports, TableDataSource, TableSort } from '@shared/components/table/table.imports';
import { User } from '@shared/models/user.model';
import { NotificationService } from '@shared/services/notification.service';
import { UserService } from '@shared/services/user.service';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
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
    LlTableImports,
    LlPaginatorImports,
    LlFilterToolbarImports,
    HlmButtonImports,
    HlmIconImports,
    HlmTooltipImports,
    HlmProgressImports,
    HlmSpinnerImports,
    HlmDropdownMenuImports,
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
      lucideShieldCheck,
    }),
  ],
})
export class UsersComponent implements OnInit, AfterViewInit {
  private readonly dialog = inject(MatDialog);
  private readonly cd = inject(ChangeDetectorRef);
  private readonly notificationService = inject(NotificationService);
  private readonly userService = inject(UserService);
  private readonly injector = inject(Injector);

  sort = viewChild.required(TableSort);
  paginator = viewChild.required(Paginator);

  isLoading = signal(true);
  isSyncLoading = signal(false);
  private readonly users = signal<User[]>([]);
  readonly dataSource = new TableDataSource<User>(this.users, this.injector);
  displayedColumns: string[] = ['email', 'name', 'active', 'providers', 'role', 'createdAt', 'updatedAt', 'actions'];

  readonly filters: FilterDef[] = [
    {
      key: 'active',
      label: 'Active',
      mode: 'single',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
      ],
    },
  ];

  private destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.dataSource.filterPredicate = FilterPredicateUtils.create<User>({
      searchFields: user => [user.email, user.displayName],
      filterFields: [{ key: 'active', accessor: user => (user.disabled ? 'inactive' : 'active') }],
    });
    this.loadData();
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort();
    this.dataSource.paginator = this.paginator();
  }

  onFilterChange(value: FilterToolbarValue): void {
    this.dataSource.filter = JSON.stringify(value);
  }

  loadData(): void {
    this.userService
      .findAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: users => {
          this.users.set(users);
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
