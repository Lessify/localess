import { ClipboardModule } from '@angular/cdk/clipboard';
import { DatePipe } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, Component, DestroyRef, inject, Injector, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { FilterPredicateUtils } from '@core/utils/filter-predicate-utils.service';
import { provideIcons } from '@ng-icons/core';
import { lucideCopy, lucidePencil, lucidePlus, lucideRefreshCw, lucideTrash } from '@ng-icons/lucide';
import {
  CONFIRMATION_DIALOG_CONTENT_CLASS,
  ConfirmationDialogComponent,
  ConfirmationDialogContext,
  ConfirmationDialogResult,
} from '@shared/components/confirmation-dialog';
import { FilterToolbarValue, LlFilterToolbarImports } from '@shared/components/filter-toolbar/filter-toolbar.imports';
import { LlPaginatorImports, Paginator } from '@shared/components/paginator/paginator.imports';
import { LlTableImports, TableDataSource, TableSort } from '@shared/components/table/table.imports';
import {
  getTokenUsageInfo,
  isTokenV2,
  PERMISSION_TEXT,
  Token,
  TOKEN_V1_IMPLICIT_PERMISSIONS,
  TokenForm,
  TokenPermission,
  TokenUsageInfo,
} from '@shared/models/token.model';
import { NotificationService } from '@shared/services/notification.service';
import { TokenService } from '@shared/services/token.service';
import { SpaceStore } from '@shared/stores/space.store';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { filter, switchMap, take } from 'rxjs/operators';

import { TokenDialogComponent } from './token-dialog/token-dialog.component';

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
    }),
  ],
})
export class TokensComponent implements AfterViewInit {
  private readonly tokenService = inject(TokenService);
  private readonly dialog = inject(MatDialog);

  private readonly hlmDialog = inject(HlmDialogService);
  private readonly notificationService = inject(NotificationService);
  private readonly injector = inject(Injector);

  sort = viewChild.required(TableSort);
  paginator = viewChild.required(Paginator);

  isLoading = signal(true);
  spaceStore = inject(SpaceStore);

  private readonly tokens = signal<Token[]>([]);
  readonly dataSource = new TableDataSource<Token>(this.tokens, this.injector);
  displayedColumns: string[] = ['id', 'name', 'version', 'permissions', 'usage', 'cacheTtl', 'updatedAt', 'actions'];

  private destroyRef = inject(DestroyRef);

  constructor() {
    this.dataSource.filterPredicate = FilterPredicateUtils.create<Token>({
      searchFields: token => [token.id, token.name],
    });
    toObservable(this.spaceStore.selectedSpace)
      .pipe(
        filter(it => it !== undefined), // Skip initial data
        switchMap(it => this.tokenService.findAll(it!.id)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: tokens => {
          this.tokens.set(tokens);
          this.isLoading.set(false);
        },
      });
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort();
    this.dataSource.paginator = this.paginator();
  }

  onFilterChange(value: FilterToolbarValue): void {
    this.dataSource.filter = JSON.stringify(value);
  }

  openAddDialog(): void {
    const spaceId = this.spaceStore.selectedSpaceId();
    this.dialog
      .open<TokenDialogComponent, never, TokenForm>(TokenDialogComponent, {
        panelClass: 'sm',
      })
      .afterClosed()
      .pipe(
        filter(it => it !== undefined),
        switchMap(it => this.tokenService.create(spaceId!, it)),
      )
      .subscribe({
        next: () => {
          this.notificationService.success('Token has been created.');
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
      .open<TokenDialogComponent, TokenForm, TokenForm>(TokenDialogComponent, {
        panelClass: 'sm',
        data: {
          name: element.name,
          permissions: isTokenV2(element) ? element.permissions : [],
          cacheTtl: isTokenV2(element) ? element.cacheTtl : undefined,
        },
      })
      .afterClosed()
      .pipe(
        filter(it => it !== undefined),
        switchMap(it => this.tokenService.update(spaceId!, element.id, it)),
      )
      .subscribe({
        next: () => {
          this.notificationService.success('Token has been created.');
        },
        error: (err: unknown) => {
          console.error(err);
          this.notificationService.error('Token can not be created.');
        },
      });
  }

  openRegenerateDialog(element: Token): void {
    const spaceId = this.spaceStore.selectedSpaceId();
    this.hlmDialog
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
        switchMap(() => this.tokenService.regenerate(spaceId!, element)),
      )
      .subscribe({
        next: () => {
          this.notificationService.success(`Token '${element.name}' has been regenerated.`);
        },
        error: () => {
          this.notificationService.error(`Token '${element.name}' can not be regenerated.`);
        },
      });
  }

  openDeleteDialog(element: Token): void {
    const spaceId = this.spaceStore.selectedSpaceId();
    this.hlmDialog
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
        switchMap(() => this.tokenService.delete(spaceId!, element.id)),
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

  permissionsToText(permissions: TokenPermission[]): string {
    return permissions.map(it => PERMISSION_TEXT[it]).join(', ');
  }

  permissionsToUsage(element: Token): TokenUsageInfo {
    return getTokenUsageInfo(isTokenV2(element) ? element.permissions : TOKEN_V1_IMPLICIT_PERMISSIONS);
  }

  copied() {
    this.notificationService.success(`Token ID copied to clipboard.`);
  }
}
