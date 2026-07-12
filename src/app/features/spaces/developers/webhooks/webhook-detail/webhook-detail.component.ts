import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  Injector,
  input,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { FilterPredicateUtils } from '@core/utils/filter-predicate-utils.service';
import { provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideChevronRight, lucideInfo, lucidePencil, lucideWebhook, lucideWebhookOff } from '@ng-icons/lucide';
import { ConfirmationDialogComponent, ConfirmationDialogModel } from '@shared/components/confirmation-dialog';
import { FilterDef, FilterToolbarValue, LlFilterToolbarImports } from '@shared/components/filter-toolbar/filter-toolbar.imports';
import { LlPaginatorImports, Paginator } from '@shared/components/paginator/paginator.imports';
import { LlTableImports, TableDataSource } from '@shared/components/table/table.imports';
import { WebHook, WebHookEvent, WebHookLog, WebHookStatus } from '@shared/models/webhook.model';
import { TimeDurationPipe } from '@shared/pipes/time-duration.pipe';
import { NotificationService } from '@shared/services/notification.service';
import { WebHookService } from '@shared/services/webhook.service';
import { SpaceStore } from '@shared/stores/space.store';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { filter, switchMap } from 'rxjs/operators';

import { WebhookDialogComponent } from '../webhook-dialog/webhook-dialog.component';
import { WebhookDialogModel } from '../webhook-dialog/webhook-dialog.model';

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
      lucideArrowLeft,
      lucidePencil,
      lucideChevronRight,
      lucideInfo,
      lucideWebhook,
      lucideWebhookOff,
    }),
  ],
})
export class WebhookDetailComponent implements OnInit, AfterViewInit {
  private readonly webhookService = inject(WebHookService);
  private readonly notificationService = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly spaceStore = inject(SpaceStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);

  webhookId = input.required<string>();

  paginator = viewChild.required(Paginator);

  isLoading = signal(true);
  isLogsLoading = signal(true);
  webhook = signal<WebHook | undefined>(undefined);

  private readonly logs = signal<WebHookLog[]>([]);
  readonly dataSource = new TableDataSource<WebHookLog>(this.logs, this.injector);
  displayedColumns: string[] = ['expand', 'id', 'event', 'status', 'duration', 'createdAt'];

  expandedLogs = signal<Set<string>>(new Set());

  protected readonly WebHookStatus = WebHookStatus;

  readonly filters: FilterDef[] = [
    {
      key: 'event',
      label: 'Event Type',
      mode: 'multiple',
      options: Object.values(WebHookEvent).map(event => ({ value: event, label: event })),
    },
    {
      key: 'status',
      label: 'Status',
      mode: 'multiple',
      options: Object.values(WebHookStatus).map(status => ({ value: status, label: status.charAt(0).toUpperCase() + status.slice(1) })),
    },
  ];

  constructor() {
    this.dataSource.filterPredicate = FilterPredicateUtils.create<WebHookLog>({
      searchFields: log => [log.id],
      filterFields: [
        { key: 'event', accessor: log => log.event },
        { key: 'status', accessor: log => log.status },
      ],
    });
  }

  ngOnInit(): void {
    const spaceId = this.spaceStore.selectedSpaceId()!;

    this.webhookService
      .findById(spaceId, this.webhookId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(webhook => {
        this.webhook.set(webhook);
        this.isLoading.set(false);
      });

    this.webhookService
      .findLogs(spaceId, this.webhookId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(logs => {
        this.logs.set(logs);
        this.isLogsLoading.set(false);
      });
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator();
  }

  onFilterChange(value: FilterToolbarValue): void {
    this.dataSource.filter = JSON.stringify(value);
  }

  openEditDialog(): void {
    const spaceId = this.spaceStore.selectedSpaceId()!;
    const webhook = this.webhook();
    if (!webhook) return;
    this.dialog
      .open<WebhookDialogComponent, WebHook, WebhookDialogModel>(WebhookDialogComponent, {
        panelClass: 'md',
        data: webhook,
      })
      .afterClosed()
      .pipe(
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

  openDeleteDialog(): void {
    const spaceId = this.spaceStore.selectedSpaceId()!;
    const webhook = this.webhook();
    if (!webhook) return;
    this.dialog
      .open<ConfirmationDialogComponent, ConfirmationDialogModel, boolean>(ConfirmationDialogComponent, {
        data: {
          title: 'Delete Webhook',
          content: `Are you sure about deleting Webhook with name '${webhook.name}'.`,
        },
      })
      .afterClosed()
      .pipe(
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

  protected eventsToText(events: WebHookEvent[]): string {
    return events.join('\n');
  }
}
