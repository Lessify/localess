import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { provideIcons } from '@ng-icons/core';
import {
  lucideArrowLeft,
  lucideCheck,
  lucideChevronRight,
  lucideCirclePlus,
  lucideInfo,
  lucidePencil,
  lucideSearch,
  lucideWebhook,
  lucideWebhookOff,
  lucideX,
} from '@ng-icons/lucide';
import { ConfirmationDialogComponent, ConfirmationDialogModel } from '@shared/components/confirmation-dialog';
import { WebHook, WebHookEvent, WebHookLog, WebHookStatus } from '@shared/models/webhook.model';
import { TimeDurationPipe } from '@shared/pipes/time-duration.pipe';
import { NotificationService } from '@shared/services/notification.service';
import { WebHookService } from '@shared/services/webhook.service';
import { SpaceStore } from '@shared/stores/space.store';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmButtonGroupImports } from '@spartan-ng/helm/button-group';
import { HlmCommandImports } from '@spartan-ng/helm/command';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmPaginationImports } from '@spartan-ng/helm/pagination';
import { HlmPopoverImports } from '@spartan-ng/helm/popover';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { HlmTableImports } from '@spartan-ng/helm/table';
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
    HlmProgressImports,
    HlmBadgeImports,
    HlmButtonImports,
    HlmButtonGroupImports,
    HlmIconImports,
    HlmTooltipImports,
    HlmTableImports,
    HlmPaginationImports,
    HlmInputImports,
    HlmPopoverImports,
    HlmCommandImports,
    TimeDurationPipe,
  ],
  providers: [
    provideIcons({
      lucideArrowLeft,
      lucidePencil,
      lucideSearch,
      lucideCirclePlus,
      lucideCheck,
      lucideChevronRight,
      lucideInfo,
      lucideX,
      lucideWebhook,
      lucideWebhookOff,
    }),
  ],
})
export class WebhookDetailComponent implements OnInit {
  private readonly webhookService = inject(WebHookService);
  private readonly notificationService = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly spaceStore = inject(SpaceStore);
  private readonly destroyRef = inject(DestroyRef);

  webhookId = input.required<string>();

  isLoading = signal(true);
  isLogsLoading = signal(true);
  webhook = signal<WebHook | undefined>(undefined);

  logs = signal<WebHookLog[]>([]);
  currentPage = signal(1);
  itemsPerPage = signal(10);

  searchId = signal('');
  eventFilter = signal<WebHookEvent[]>([]);
  statusFilter = signal<WebHookStatus[]>([]);
  expandedLogs = signal<Set<string>>(new Set());

  readonly webhookEvents = Object.values(WebHookEvent);
  readonly webhookStatuses = Object.values(WebHookStatus);
  protected readonly WebHookStatus = WebHookStatus;

  hasActiveFilters = computed(() => this.searchId().length > 0 || this.eventFilter().length > 0 || this.statusFilter().length > 0);

  filteredLogs = computed(() => {
    const id = this.searchId().trim().toLowerCase();
    const events = this.eventFilter();
    const statuses = this.statusFilter();
    return this.logs().filter(log => {
      if (id && !log.id.toLowerCase().includes(id)) return false;
      if (events.length > 0 && !events.includes(log.event)) return false;
      if (statuses.length > 0 && !statuses.includes(log.status)) return false;
      return true;
    });
  });

  totalItems = computed(() => this.filteredLogs().length);
  pagedLogs = computed(() => {
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    return this.filteredLogs().slice(start, start + this.itemsPerPage());
  });

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
        console.log(logs);
      });
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

  onSearchChange(value: string): void {
    this.searchId.set(value);
    this.currentPage.set(1);
  }

  isEventSelected(event: WebHookEvent): boolean {
    return this.eventFilter().includes(event);
  }

  toggleEventFilter(event: WebHookEvent): void {
    const current = this.eventFilter();
    this.eventFilter.set(current.includes(event) ? current.filter(e => e !== event) : [...current, event]);
    this.currentPage.set(1);
  }

  isStatusSelected(status: WebHookStatus): boolean {
    return this.statusFilter().includes(status);
  }

  toggleStatusFilter(status: WebHookStatus): void {
    const current = this.statusFilter();
    this.statusFilter.set(current.includes(status) ? current.filter(s => s !== status) : [...current, status]);
    this.currentPage.set(1);
  }

  resetFilters(): void {
    this.searchId.set('');
    this.eventFilter.set([]);
    this.statusFilter.set([]);
    this.currentPage.set(1);
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
