import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, Injector, input, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { NotificationService } from '@core/services/notification.service';
import { SpaceStore } from '@core/stores/space.store';
import { PagedList } from '@core/utils/paged-list';
import { Webhook, WebhookEvent, WebhookLog, WebhookStatus, WebhookUpdate } from '@localess/shared';
import { provideIcons } from '@ng-icons/core';
import {
  lucideArrowLeft,
  lucideChevronRight,
  lucideInfo,
  lucideKeyRound,
  lucidePencil,
  lucideRefreshCw,
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
import { LlTableImports, TableDataSource } from '@shared/components/table/table.imports';
import { TimeDurationPipe } from '@shared/pipes/time-duration.pipe';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { EMPTY, of } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';

import { WebhookService } from '../webhook.service';
import { WebhookDialogComponent } from '../webhook-dialog/webhook-dialog.component';
import { WebhookDialogContext } from '../webhook-dialog/webhook-dialog.model';
import { WebhookSecretDialogComponent, WebhookSecretDialogContext } from '../webhook-secret-dialog/webhook-secret-dialog.component';

@Component({
  selector: 'll-webhook-detail',
  templateUrl: './webhook-detail.component.html',
  styleUrls: ['./webhook-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    LlTableImports,
    LlPaginatorImports,
    LlFilterToolbarImports,
    HlmProgressImports,
    HlmBadgeImports,
    HlmButtonImports,
    HlmIconImports,
    HlmTooltipImports,
    TimeDurationPipe,
  ],
  providers: [
    provideIcons({
      lucideKeyRound,
      lucideRefreshCw,
      lucideArrowLeft,
      lucidePencil,
      lucideChevronRight,
      lucideInfo,
      lucideWebhook,
      lucideWebhookOff,
    }),
  ],
})
export class WebhookDetailComponent implements OnInit {
  private readonly webhookService = inject(WebhookService);
  private readonly notificationService = inject(NotificationService);
  private readonly dialog = inject(HlmDialogService);
  private readonly router = inject(Router);
  private readonly spaceStore = inject(SpaceStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);

  webhookId = input.required<string>();

  isLoading = signal(true);
  isLogsLoading = signal(true);
  webhook = signal<Webhook | undefined>(undefined);

  /** The page of delivery logs shown: newest first, filtered and searched on the server. */
  readonly list = new PagedList(20);
  readonly logsTotal = signal(0);
  private readonly logs = signal<WebhookLog[]>([]);
  readonly dataSource = new TableDataSource<WebhookLog>(this.logs, this.injector);
  displayedColumns: string[] = ['expand', 'id', 'event', 'status', 'duration', 'createdAt'];

  expandedLogs = signal<Set<string>>(new Set());

  protected readonly WebhookStatus = WebhookStatus;

  readonly filters: FilterDef[] = [
    {
      key: 'event',
      label: 'Event Type',
      mode: 'multiple',
      options: Object.values(WebhookEvent).map(event => ({ value: event, label: event })),
    },
    {
      key: 'status',
      label: 'Status',
      mode: 'multiple',
      options: Object.values(WebhookStatus).map(status => ({ value: status, label: status.charAt(0).toUpperCase() + status.slice(1) })),
    },
  ];

  ngOnInit(): void {
    const spaceId = this.spaceStore.selectedSpaceId()!;

    this.webhookService
      .findById(spaceId, this.webhookId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(webhook => {
        this.webhook.set(webhook);
        this.isLoading.set(false);
      });

    // The current query's page, again whenever it changes, and live (a new delivery reloads the page shown). A failed
    // load is told and ends only that request.
    toObservable(this.list.params, { injector: this.injector })
      .pipe(
        switchMap(params =>
          this.webhookService.findLogs(spaceId, this.webhookId(), params).pipe(
            catchError(() => {
              this.notificationService.error('Logs can not be loaded.');
              this.isLogsLoading.set(false);
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(page => {
        this.logs.set(page.items);
        this.logsTotal.set(page.total);
        this.list.onLoaded(page);
        this.isLogsLoading.set(false);
      });
  }

  /** The search box (the log id), Event Type and Status (any of them), on the server; from the first page. */
  onFilterChange(value: FilterToolbarValue): void {
    this.list.setFilters({ search: value.search?.trim() || undefined, event: value['event'], status: value['status'] });
  }

  openEditDialog(): void {
    const spaceId = this.spaceStore.selectedSpaceId()!;
    const webhook = this.webhook();
    if (!webhook) return;
    this.dialog
      .open<WebhookUpdate, WebhookDialogContext>(WebhookDialogComponent, {
        context: webhook,
        contentClass: DIALOG_WIDTH_SM,
      })
      .closed$.pipe(
        take(1),
        filter(it => it !== undefined),
        switchMap(it => this.webhookService.update(spaceId, webhook.id, it!)),
      )
      .subscribe({
        next: () => this.notificationService.success('Webhook has been updated.'),
        error: (err: unknown) => {
          console.error(err);
          this.notificationService.error('Webhook can not be updated.');
        },
      });
  }

  changeStatus(): void {
    const spaceId = this.spaceStore.selectedSpaceId()!;
    const webhook = this.webhook();
    if (!webhook) return;
    this.webhookService.updateStatus(spaceId, webhook.id, !webhook.enabled).subscribe({
      next: () => this.notificationService.success(`Webhook '${webhook.name}' has been ${!webhook.enabled ? 'enabled' : 'disabled'}.`),
      error: (err: unknown) => {
        console.error(err);
        this.notificationService.error(`Webhook '${webhook.name}' can not be ${!webhook.enabled ? 'enabled' : 'disabled'}.`);
      },
    });
  }

  /**
   * Signs deliveries with a new secret, shown once. Replacing one asks first: the receiver must get the new secret, or
   * it refuses every delivery from then on.
   */
  createSecret(): void {
    const spaceId = this.spaceStore.selectedSpaceId()!;
    const webhook = this.webhook();
    if (!webhook) return;
    const confirmed = webhook.hasSecret
      ? this.dialog
          .open<ConfirmationDialogResult, ConfirmationDialogContext>(ConfirmationDialogComponent, {
            context: {
              title: 'Regenerate Secret',
              content: `The current secret of '${webhook.name}' stops at once: deliveries are signed with the new one, which your receiver needs.`,
              variant: 'destructive',
            },
            contentClass: CONFIRMATION_DIALOG_CONTENT_CLASS,
          })
          .closed$.pipe(
            take(1),
            filter(it => it || false),
          )
      : of(true);
    confirmed.pipe(switchMap(() => this.webhookService.createSecret(spaceId, webhook.id))).subscribe({
      next: updated => {
        this.notificationService.success(`Webhook '${webhook.name}' signs its deliveries with a new secret.`);
        this.dialog.open<void, WebhookSecretDialogContext>(WebhookSecretDialogComponent, {
          context: { name: updated.name, secret: updated.secret! },
          contentClass: DIALOG_WIDTH_SM,
        });
      },
      error: () => this.notificationService.error(`A secret for webhook '${webhook.name}' can not be made.`),
    });
  }

  /** Deliveries are no longer signed: asks first, a receiver that checks signatures refuses them. */
  removeSecret(): void {
    const spaceId = this.spaceStore.selectedSpaceId()!;
    const webhook = this.webhook();
    if (!webhook) return;
    this.dialog
      .open<ConfirmationDialogResult, ConfirmationDialogContext>(ConfirmationDialogComponent, {
        context: {
          title: 'Turn Off Signing',
          content: `Deliveries of '${webhook.name}' will no longer be signed; a receiver that checks signatures refuses them.`,
          variant: 'destructive',
        },
        contentClass: CONFIRMATION_DIALOG_CONTENT_CLASS,
      })
      .closed$.pipe(
        take(1),
        filter(it => it || false),
        switchMap(() => this.webhookService.removeSecret(spaceId, webhook.id)),
      )
      .subscribe({
        next: () => this.notificationService.success(`Webhook '${webhook.name}' no longer signs its deliveries.`),
        error: () => this.notificationService.error(`Signing of webhook '${webhook.name}' can not be turned off.`),
      });
  }

  openDeleteDialog(): void {
    const spaceId = this.spaceStore.selectedSpaceId()!;
    const webhook = this.webhook();
    if (!webhook) return;
    this.dialog
      .open<ConfirmationDialogResult, ConfirmationDialogContext>(ConfirmationDialogComponent, {
        context: {
          title: 'Delete Webhook',
          content: `Are you sure about deleting Webhook with name '${webhook.name}'.`,
          variant: 'destructive',
        },
        contentClass: CONFIRMATION_DIALOG_CONTENT_CLASS,
      })
      .closed$.pipe(
        take(1),
        filter(it => it || false),
        switchMap(() => this.webhookService.delete(spaceId, webhook.id)),
      )
      .subscribe({
        next: () => {
          this.notificationService.success(`Webhook '${webhook.name}' has been deleted.`);
          this.goBack();
        },
        error: () => this.notificationService.error(`Webhook '${webhook.name}' can not be deleted.`),
      });
  }

  goBack(): void {
    const spaceId = this.spaceStore.selectedSpaceId()!;
    this.router.navigate(['features', 'spaces', spaceId, 'developers', 'webhooks']);
  }

  isLogExpanded(id: string): boolean {
    return this.expandedLogs().has(id);
  }

  toggleLogExpanded(id: string): void {
    const current = new Set(this.expandedLogs());
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    this.expandedLogs.set(current);
  }

  protected eventsToText(events: WebhookEvent[]): string {
    return events.join('\n');
  }
}
