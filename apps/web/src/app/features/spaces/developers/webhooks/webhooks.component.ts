import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, Injector, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { NotificationService } from '@core/services/notification.service';
import { SpaceStore } from '@core/stores/space.store';
import { apiErrorMessage } from '@core/utils/api-error';
import { PagedList } from '@core/utils/paged-list';
import { WebHook, WebHookEvent } from '@localess/shared';
import { provideIcons } from '@ng-icons/core';
import {
  lucideEllipsisVertical,
  lucidePencil,
  lucidePlus,
  lucideShieldAlert,
  lucideTrash,
  lucideWebhook,
  lucideWebhookOff,
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
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { combineLatest, EMPTY } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';

import { WebHookService } from './webhook.service';
import { WebhookDialogComponent } from './webhook-dialog/webhook-dialog.component';
import { WebhookDialogContext, WebhookDialogResult } from './webhook-dialog/webhook-dialog.model';
import { WebhookSecretDialogComponent, WebhookSecretDialogContext } from './webhook-secret-dialog/webhook-secret-dialog.component';

/** The space's webhooks: one page from the server, by name unless sorted otherwise; reloads on a webhook change. */
@Component({
  selector: 'll-space-developers-webhooks',
  templateUrl: './webhooks.component.html',
  styleUrls: ['./webhooks.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    LlTableImports,
    LlPaginatorImports,
    LlFilterToolbarImports,
    DatePipe,
    HlmProgressImports,
    HlmBadgeImports,
    HlmTooltipImports,
    HlmButtonImports,
    HlmIconImports,
    HlmDropdownMenuImports,
  ],
  providers: [
    provideIcons({
      lucidePlus,
      lucideShieldAlert,
      lucideEllipsisVertical,
      lucideTrash,
      lucidePencil,
      lucideWebhook,
      lucideWebhookOff,
    }),
  ],
})
export class WebhooksComponent {
  private readonly webhookService = inject(WebHookService);
  private readonly dialog = inject(HlmDialogService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);

  isLoading = signal(true);
  spaceStore = inject(SpaceStore);

  /** The page shown: paged, sorted, filtered and searched on the server. */
  readonly list = new PagedList(20);
  readonly total = signal(0);
  private readonly webhooks = signal<WebHook[]>([]);
  readonly dataSource = new TableDataSource<WebHook>(this.webhooks, this.injector);
  displayedColumns: string[] = ['name', 'enabled', 'events', 'updatedAt', 'actions'];

  readonly filters: FilterDef[] = [
    {
      key: 'enabled',
      label: 'Status',
      mode: 'single',
      options: [
        { value: 'true', label: 'Enabled' },
        { value: 'false', label: 'Disabled' },
      ],
    },
    {
      key: 'events',
      label: 'Events',
      mode: 'multiple',
      options: Object.values(WebHookEvent).map(event => ({ value: event, label: event })),
    },
  ];

  private destroyRef = inject(DestroyRef);

  /**
   * The current query's page for the selected space, again whenever either changes (and live). A failed load is told
   * and ends only that request: the next query change fetches again.
   */
  constructor() {
    combineLatest([toObservable(this.spaceStore.selectedSpaceId).pipe(filter(it => it !== undefined)), toObservable(this.list.params)])
      .pipe(
        switchMap(([spaceId, params]) =>
          this.webhookService.findAll(spaceId!, params).pipe(
            catchError(() => {
              this.notificationService.error('Webhooks can not be loaded.');
              this.isLoading.set(false);
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(page => {
        this.webhooks.set(page.items);
        this.total.set(page.total);
        this.list.onLoaded(page);
        this.isLoading.set(false);
      });
  }

  /** The search box (name or URL), Status and Events (any of them), on the server; from the first page. */
  onFilterChange(value: FilterToolbarValue): void {
    this.list.setFilters({ search: value.search?.trim() || undefined, enabled: value['enabled'], event: value['events'] });
  }

  /** Cleared: back to by name. */
  onSortChange(sort: TableSortState): void {
    this.list.setSort(sort.active, sort.direction);
  }

  navigateToDetail(webhook: WebHook): void {
    const spaceId = this.spaceStore.selectedSpaceId()!;
    this.router.navigate(['features', 'spaces', spaceId, 'developers', 'webhooks', webhook.id]);
  }

  openAddDialog(): void {
    const spaceId = this.spaceStore.selectedSpaceId();
    this.dialog
      .open<WebhookDialogResult>(WebhookDialogComponent, {
        contentClass: DIALOG_WIDTH_SM,
      })
      .closed$.pipe(
        take(1),
        filter(it => it !== undefined),
        switchMap(it => this.webhookService.create(spaceId!, it!)),
      )
      .subscribe({
        next: webhook => {
          this.notificationService.success('Webhook has been created.');
          if (webhook.secret) {
            this.dialog.open<void, WebhookSecretDialogContext>(WebhookSecretDialogComponent, {
              context: { name: webhook.name, secret: webhook.secret },
              contentClass: DIALOG_WIDTH_SM,
            });
          }
        },
        error: (err: unknown) => {
          console.error(err);
          this.notificationService.error(apiErrorMessage(err, 'Webhook can not be created.'));
        },
      });
  }

  openEditDialog(element: WebHook): void {
    const spaceId = this.spaceStore.selectedSpaceId();
    this.dialog
      .open<WebhookDialogResult, WebhookDialogContext>(WebhookDialogComponent, {
        context: element,
        contentClass: DIALOG_WIDTH_SM,
      })
      .closed$.pipe(
        take(1),
        filter(it => it !== undefined),
        switchMap(it => this.webhookService.update(spaceId!, element.id, it!)),
      )
      .subscribe({
        next: () => this.notificationService.success('Webhook has been updated.'),
        error: (err: unknown) => {
          console.error(err);
          this.notificationService.error(apiErrorMessage(err, 'Webhook can not be updated.'));
        },
      });
  }

  changeStatus(element: WebHook): void {
    const spaceId = this.spaceStore.selectedSpaceId();
    this.webhookService.updateStatus(spaceId!, element.id, !element.enabled).subscribe({
      next: () => this.notificationService.success(`Webhook '${element.name}' has been ${!element.enabled ? 'enabled' : 'disabled'}.`),
      error: (err: unknown) => {
        console.error(err);
        this.notificationService.error(`Webhook '${element.name}' can not be ${!element.enabled ? 'enabled' : 'disabled'}.`);
      },
    });
  }

  openDeleteDialog(element: WebHook): void {
    const spaceId = this.spaceStore.selectedSpaceId();
    this.dialog
      .open<ConfirmationDialogResult, ConfirmationDialogContext>(ConfirmationDialogComponent, {
        context: {
          title: 'Delete Webhook',
          content: `Are you sure about deleting Webhook with name '${element.name}'.`,
          variant: 'destructive',
        },
        contentClass: CONFIRMATION_DIALOG_CONTENT_CLASS,
      })
      .closed$.pipe(
        take(1),
        filter(it => it || false),
        switchMap(() => this.webhookService.delete(spaceId!, element.id)),
      )
      .subscribe({
        next: () => this.notificationService.success(`Webhook '${element.name}' has been deleted.`),
        error: () => this.notificationService.error(`Webhook '${element.name}' can not be deleted.`),
      });
  }

  protected eventsToText(events: WebHookEvent[]) {
    return events.join('\n');
  }
}
