import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, Injector, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { NotificationService } from '@core/services/notification.service';
import { UserStore } from '@core/stores/user.store';
import { PagedList } from '@core/utils/paged-list';
import { OAuthProvider, User } from '@localess/shared';
import { provideIcons } from '@ng-icons/core';
import {
  lucideCheck,
  lucideEllipsisVertical,
  lucideInfo,
  lucideKeyRound,
  lucideLock,
  lucideMail,
  lucidePencil,
  lucideShieldCheck,
  lucideTrash,
  lucideUserCheck,
  lucideUserPlus,
  lucideUserX,
  lucideX,
} from '@ng-icons/lucide';
import {
  CONFIRMATION_DIALOG_CONTENT_CLASS,
  ConfirmationDialogComponent,
  ConfirmationDialogContext,
  ConfirmationDialogResult,
} from '@shared/components/confirmation-dialog';
import { DIALOG_WIDTH_SM } from '@shared/components/dialog/dialog-width';
import { FilterDef, FilterToolbarValue, LlFilterToolbarImports } from '@shared/components/filter-toolbar/filter-toolbar.imports';
import { LlPaginatorImports } from '@shared/components/paginator/paginator.imports';
import { LlTableImports, TableDataSource, TableSortState } from '@shared/components/table/table.imports';
import { roleLabel } from '@shared/models/user-role.model';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { EMPTY, of } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';

import { UserService } from './user.service';
import { UserAddDialogComponent } from './user-add-dialog/user-add-dialog.component';
import { UserAddDialogResult } from './user-add-dialog/user-add-dialog.model';
import { UserDialogComponent } from './user-dialog/user-dialog.component';
import { UserDialogContext, UserDialogResult } from './user-dialog/user-dialog.model';

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
    HlmDropdownMenuImports,
  ],
  providers: [
    provideIcons({
      lucideUserPlus,
      lucidePencil,
      lucideTrash,
      lucideCheck,
      lucideX,
      lucideMail,
      lucideEllipsisVertical,
      lucideInfo,
      lucideLock,
      lucideShieldCheck,
      lucideKeyRound,
      lucideUserX,
      lucideUserCheck,
    }),
  ],
})
export class UsersComponent implements OnInit {
  private readonly dialog = inject(HlmDialogService);
  private readonly cd = inject(ChangeDetectorRef);
  private readonly notificationService = inject(NotificationService);
  private readonly userService = inject(UserService);
  private readonly injector = inject(Injector);
  private readonly userStore = inject(UserStore);

  isLoading = signal(true);
  /** The page shown: paged, sorted and filtered on the server (`GET /api/app/users`). */
  readonly list = new PagedList(20);
  readonly total = signal(0);
  private readonly users = signal<User[]>([]);
  readonly dataSource = new TableDataSource<User>(this.users, this.injector);
  /** How an OAuth login is named in the Sign-in column. */
  protected readonly loginLabel = (provider: OAuthProvider): string => (provider === 'google' ? 'Google' : 'Microsoft');

  displayedColumns: string[] = ['email', 'name', 'active', 'signIn', 'role', 'createdAt', 'updatedAt', 'actions'];

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
    this.loadData();
  }

  /** Admin → Users is for admins only (the route and the server): every user may be managed. */
  protected readonly roleLabel = roleLabel;

  /** The search box (email or display name) and the Active filter, on the server; from the first page. */
  onFilterChange(value: FilterToolbarValue): void {
    const active = value['active'];
    this.list.setFilters({ search: value.search?.trim() || undefined, active: typeof active === 'string' ? active : undefined });
  }

  onSortChange(sort: TableSortState): void {
    this.list.setSort(sort.active, sort.direction);
  }

  /**
   * The current query's page, again whenever the query changes or a user does (live). A failed load is told and
   * ends only that request: the next query change (page, sort, search) fetches again.
   */
  loadData(): void {
    toObservable(this.list.params, { injector: this.injector })
      .pipe(
        switchMap(params =>
          this.userService.findAll(params).pipe(
            catchError(() => {
              this.notificationService.error('Users can not be loaded.');
              this.isLoading.set(false);
              this.cd.markForCheck();
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(page => {
        this.users.set(page.items);
        this.total.set(page.total);
        this.list.onLoaded(page);
        this.isLoading.set(false);
        this.cd.markForCheck();
      });
  }

  openAddDialog(): void {
    this.dialog
      .open<UserAddDialogResult>(UserAddDialogComponent, {
        contentClass: DIALOG_WIDTH_SM,
      })
      .closed$.pipe(
        take(1),
        filter(it => it !== undefined),
        switchMap(it => this.userService.create(it!)),
      )
      .subscribe({
        next: () => {
          this.notificationService.success('User has been added.');
        },
        error: () => {
          this.notificationService.error('User can not be added.');
        },
      });
  }

  openEditDialog(element: User): void {
    this.dialog
      .open<UserDialogResult, UserDialogContext>(UserDialogComponent, {
        context: { role: element.role },
        contentClass: DIALOG_WIDTH_SM,
      })
      .closed$.pipe(
        take(1),
        filter(it => it !== undefined),
        switchMap(it => this.userService.update(element.id, it!)),
      )
      .subscribe({
        next: () => {
          this.notificationService.success('User has been updated.');
        },
        error: error => {
          this.notifyError('User can not be updated.', error);
          console.error(error);
        },
      });
  }

  openDeleteDialog(element: User): void {
    this.dialog
      .open<ConfirmationDialogResult, ConfirmationDialogContext>(ConfirmationDialogComponent, {
        context: {
          title: 'Delete User',
          content: `Are you sure about deleting User with email '${element.email}'.`,
          variant: 'destructive',
        },
        contentClass: CONFIRMATION_DIALOG_CONTENT_CLASS,
      })
      .closed$.pipe(
        take(1),
        filter(it => it || false),
        switchMap(() => this.userService.remove(element.id)),
      )
      .subscribe({
        next: () => {
          this.notificationService.success(`User '${element.email}' has been deleted.`);
        },
        error: error => {
          this.notifyError(`User '${element.email}' can not be deleted.`, error);
        },
      });
  }

  /** Disable/Enable is offered on everyone except yourself (the server refuses that too). */
  canChangeStatus(element: User): boolean {
    return element.id !== this.userStore.id();
  }

  /** Disabling asks first: it signs the user out at once. Enabling just lets them sign in again. */
  toggleDisabled(element: User): void {
    const disabled = !element.disabled;
    const confirmed$ = disabled
      ? this.dialog
          .open<ConfirmationDialogResult, ConfirmationDialogContext>(ConfirmationDialogComponent, {
            context: {
              title: 'Disable User',
              content: `Disable '${element.email}'? They are signed out at once and cannot sign in until enabled again.`,
              variant: 'destructive',
            },
            contentClass: CONFIRMATION_DIALOG_CONTENT_CLASS,
          })
          .closed$.pipe(
            take(1),
            filter(it => it || false),
          )
      : of(true);
    confirmed$.pipe(switchMap(() => this.userService.updateStatus(element.id, { disabled }))).subscribe({
      next: () => {
        this.notificationService.success(
          disabled
            ? `User '${element.email}' has been disabled. They are signed out and cannot sign in.`
            : `User '${element.email}' has been enabled.`,
        );
      },
      error: error => {
        this.notifyError(`User '${element.email}' can not be ${disabled ? 'disabled' : 'enabled'}.`, error);
      },
    });
  }

  copyPasswordResetLink(element: User): void {
    this.userService
      .createPasswordResetLink(element.id)
      .pipe(switchMap(({ url }) => navigator.clipboard.writeText(url)))
      .subscribe({
        next: () => {
          this.notificationService.success(`Password reset link for '${element.email}' copied to clipboard. It is valid for one hour.`);
        },
        error: () => {
          this.notificationService.error(`Password reset link for '${element.email}' can not be created.`);
        },
      });
  }

  /** A 409 is the server refusing the change (e.g. the last active admin): its message says why. */
  private notifyError(message: string, error: unknown): void {
    if (error instanceof HttpErrorResponse && error.status === 409 && typeof error.error?.message === 'string') {
      this.notificationService.error(message, { description: error.error.message });
    } else {
      this.notificationService.error(message);
    }
  }
}
