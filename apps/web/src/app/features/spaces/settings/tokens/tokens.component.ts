import { ClipboardModule } from '@angular/cdk/clipboard';
import { DatePipe, DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, Injector, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { NotificationService } from '@core/services/notification.service';
import { SpaceTokenService } from '@core/services/space-token.service';
import { SpaceStore } from '@core/stores/space.store';
import { PagedList } from '@core/utils/paged-list';
import { Token, TokenType } from '@localess/shared';
import { provideIcons } from '@ng-icons/core';
import {
  lucideCopy,
  lucideEye,
  lucideGlobe,
  lucideKeyRound,
  lucidePencil,
  lucidePlus,
  lucideRefreshCw,
  lucideTrash,
} from '@ng-icons/lucide';
import {
  CONFIRMATION_DIALOG_CONTENT_CLASS,
  ConfirmationDialogComponent,
  ConfirmationDialogContext,
  ConfirmationDialogResult,
} from '@shared/components/confirmation-dialog';
import { DIALOG_WIDTH_SM } from '@shared/components/dialog/dialog-width';
import { FilterToolbarValue, LlFilterToolbarImports } from '@shared/components/filter-toolbar/filter-toolbar.imports';
import { LlPaginatorImports } from '@shared/components/paginator/paginator.imports';
import { LlTableImports, TableDataSource, TableSortState } from '@shared/components/table/table.imports';
import { TOKEN_TYPE_INFO, TokenForm } from '@shared/models/token.model';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { combineLatest, EMPTY } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';

import { TokenDialogComponent } from './token-dialog/token-dialog.component';
import { TokenSecretDialogComponent, TokenSecretDialogContext } from './token-secret-dialog/token-secret-dialog.component';

/** The space's API tokens: one page from the server, newest first unless sorted otherwise; reloads on a token change. */
@Component({
  selector: 'll-space-settings-tokens',
  templateUrl: './tokens.component.html',
  styleUrls: ['./tokens.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    LlTableImports,
    LlPaginatorImports,
    LlFilterToolbarImports,
    ClipboardModule,
    DatePipe,
    HlmProgressImports,
    HlmButtonImports,
    HlmIconImports,
    HlmTooltipImports,
    HlmBadgeImports,
  ],
  providers: [
    provideIcons({
      lucidePlus,
      lucideTrash,
      lucideCopy,
      lucidePencil,
      lucideRefreshCw,
      lucideGlobe,
      lucideEye,
      lucideKeyRound,
    }),
  ],
})
export class TokensComponent {
  private readonly spaceTokenService = inject(SpaceTokenService);
  private readonly dialog = inject(HlmDialogService);
  private readonly notificationService = inject(NotificationService);
  private readonly injector = inject(Injector);
  private readonly document = inject(DOCUMENT);

  isLoading = signal(true);
  spaceStore = inject(SpaceStore);

  /** The page shown: paged, sorted and searched on the server. */
  readonly list = new PagedList(20);
  readonly total = signal(0);
  private readonly tokens = signal<Token[]>([]);
  readonly dataSource = new TableDataSource<Token>(this.tokens, this.injector);
  displayedColumns: string[] = ['hint', 'name', 'type', 'cacheTtl', 'updatedAt', 'actions'];
  readonly typeInfo = TOKEN_TYPE_INFO;

  private destroyRef = inject(DestroyRef);

  /**
   * The current query's page for the selected space, again whenever either changes (and live). A failed load is told
   * and ends only that request: the next query change fetches again.
   */
  constructor() {
    combineLatest([toObservable(this.spaceStore.selectedSpaceId).pipe(filter(it => it !== undefined)), toObservable(this.list.params)])
      .pipe(
        switchMap(([spaceId, params]) =>
          this.spaceTokenService.findAll(spaceId!, params).pipe(
            catchError(() => {
              this.notificationService.error('Tokens can not be loaded.');
              this.isLoading.set(false);
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(page => {
        this.tokens.set(page.items);
        this.total.set(page.total);
        this.list.onLoaded(page);
        this.isLoading.set(false);
      });
  }

  /** The search box (the name or the hint), on the server; from the first page. */
  onFilterChange(value: FilterToolbarValue): void {
    this.list.setFilters({ search: value.search?.trim() || undefined });
  }

  /** Cleared: back to newest first. */
  onSortChange(sort: TableSortState): void {
    this.list.setSort(sort.active, sort.direction);
  }

  openAddDialog(): void {
    const spaceId = this.spaceStore.selectedSpaceId();
    this.dialog
      .open<TokenForm>(TokenDialogComponent, {
        contentClass: DIALOG_WIDTH_SM,
      })
      .closed$.pipe(
        take(1),
        filter(it => it !== undefined),
        switchMap(it => this.spaceTokenService.create(spaceId!, it)),
      )
      .subscribe({
        next: token => {
          this.notificationService.success('Token has been created.');
          this.showSecret(token);
        },
        error: (err: unknown) => {
          console.error(err);
          this.notificationService.error('Token can not be created.');
        },
      });
  }

  openEditDialog(element: Token): void {
    const spaceId = this.spaceStore.selectedSpaceId();
    this.dialog
      .open<TokenForm, TokenForm>(TokenDialogComponent, {
        context: {
          name: element.name,
          type: element.type,
          cacheTtl: element.cacheTtl,
        },
        contentClass: DIALOG_WIDTH_SM,
      })
      .closed$.pipe(
        take(1),
        filter(it => it !== undefined),
        switchMap(it => this.spaceTokenService.update(spaceId!, element.id, { name: it.name, cacheTtl: it.cacheTtl })),
      )
      .subscribe({
        next: () => {
          this.notificationService.success('Token has been updated.');
        },
        error: (err: unknown) => {
          console.error(err);
          this.notificationService.error('Token can not be updated.');
        },
      });
  }

  openRegenerateDialog(element: Token): void {
    const spaceId = this.spaceStore.selectedSpaceId();
    this.dialog
      .open<ConfirmationDialogResult, ConfirmationDialogContext>(ConfirmationDialogComponent, {
        context: {
          title: 'Regenerate Token',
          content: `Are you sure you want to regenerate the token '${element.name}'? All clients using the current token will immediately lose access and must be updated with the new token.`,
          variant: 'destructive',
        },
        contentClass: CONFIRMATION_DIALOG_CONTENT_CLASS,
      })
      .closed$.pipe(
        take(1),
        filter(it => it || false),
        switchMap(() => this.spaceTokenService.regenerate(spaceId!, element)),
      )
      .subscribe({
        next: token => {
          this.notificationService.success(`Token '${element.name}' has been regenerated.`);
          this.showSecret(token);
        },
        error: () => {
          this.notificationService.error(`Token '${element.name}' can not be regenerated.`);
        },
      });
  }

  openDeleteDialog(element: Token): void {
    const spaceId = this.spaceStore.selectedSpaceId();
    this.dialog
      .open<ConfirmationDialogResult, ConfirmationDialogContext>(ConfirmationDialogComponent, {
        context: {
          title: 'Delete Token',
          content: `Are you sure about deleting Token with name '${element.name}'.`,
          variant: 'destructive',
        },
        contentClass: CONFIRMATION_DIALOG_CONTENT_CLASS,
      })
      .closed$.pipe(
        take(1),
        filter(it => it || false),
        switchMap(() => this.spaceTokenService.remove(spaceId!, element.id)),
      )
      .subscribe({
        next: () => {
          this.notificationService.success(`Token '${element.name}' has been deleted.`);
        },
        error: () => {
          this.notificationService.error(`Token '${element.name}' can not be deleted.`);
        },
      });
  }

  copied() {
    this.notificationService.success(`Token copied to clipboard.`);
  }

  /** A new or regenerated management token: its value and CLI login, shown this once. */
  private showSecret(token: Token): void {
    if (token.type !== TokenType.MANAGEMENT || !token.token) return;
    const spaceId = this.spaceStore.selectedSpaceId();
    this.dialog.open<void, TokenSecretDialogContext>(TokenSecretDialogComponent, {
      context: {
        name: token.name,
        token: token.token,
        cliLogin: `localess login --origin ${this.document.location.origin} --space ${spaceId} --token ${token.token}`,
      },
      contentClass: DIALOG_WIDTH_SM,
      // The value is never shown again: only the dialog's own button closes it, not Escape, a stray click or the ✕.
      disableClose: true,
      closeOnOutsidePointerEvents: false,
      showCloseButton: false,
    });
  }
}
