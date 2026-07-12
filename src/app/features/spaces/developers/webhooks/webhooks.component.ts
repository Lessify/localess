import { DatePipe } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, Component, DestroyRef, inject, Injector, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { FilterPredicateUtils } from '@core/utils/filter-predicate-utils.service';
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
import { ConfirmationDialogComponent, ConfirmationDialogModel } from '@shared/components/confirmation-dialog';
import { FilterDef, FilterToolbarValue, LlFilterToolbarImports } from '@shared/components/filter-toolbar/filter-toolbar.imports';
import { LlPaginatorImports, Paginator } from '@shared/components/paginator/paginator.imports';
import { LlTableImports, TableDataSource, TableSort } from '@shared/components/table/table.imports';
import { WebHook, WebHookEvent } from '@shared/models/webhook.model';
import { NotificationService } from '@shared/services/notification.service';
import { WebHookService } from '@shared/services/webhook.service';
import { SpaceStore } from '@shared/stores/space.store';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { filter, switchMap } from 'rxjs/operators';

import { WebhookDialogComponent } from './webhook-dialog/webhook-dialog.component';
import { WebhookDialogModel } from './webhook-dialog/webhook-dialog.model';

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
export class WebhooksComponent implements AfterViewInit {
  private readonly webhookService = inject(WebHookService);
  private readonly dialog = inject(MatDialog);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);

  sort = viewChild.required(TableSort);
  paginator = viewChild.required(Paginator);

  isLoading = signal(true);
  spaceStore = inject(SpaceStore);

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

  constructor() {
    this.dataSource.filterPredicate = FilterPredicateUtils.create<WebHook>({
      searchFields: webhook => [webhook.name, webhook.url],
      filterFields: [
        { key: 'enabled', accessor: webhook => String(webhook.enabled) },
        { key: 'events', accessor: webhook => webhook.events },
      ],
    });
    toObservable(this.spaceStore.selectedSpace)
      .pipe(
        filter(it => it !== undefined),
        switchMap(it => this.webhookService.findAll(it!.id)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: webhooks => {
          this.webhooks.set(webhooks);
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

  navigateToDetail(webhook: WebHook): void {
    const spaceId = this.spaceStore.selectedSpaceId()!;
    this.router.navigate(['features', 'spaces', spaceId, 'developers', 'webhooks', webhook.id]);
  }

  openAddDialog(): void {
    const spaceId = this.spaceStore.selectedSpaceId();
    this.dialog
      .open<WebhookDialogComponent, undefined, WebhookDialogModel>(WebhookDialogComponent, {
        panelClass: 'md',
      })
      .afterClosed()
      .pipe(
        filter(it => it !== undefined),
        switchMap(it => this.webhookService.create(spaceId!, it!)),
      )
      .subscribe({
        next: () => this.notificationService.success('Webhook has been created.'),
        error: (err: unknown) => {
          console.error(err);
          this.notificationService.error('Webhook can not be created.');
        },
      });
  }

  openEditDialog(element: WebHook): void {
    const spaceId = this.spaceStore.selectedSpaceId();
    this.dialog
      .open<WebhookDialogComponent, WebHook, WebhookDialogModel>(WebhookDialogComponent, {
        panelClass: 'md',
        data: element,
      })
      .afterClosed()
      .pipe(
        filter(it => it !== undefined),
        switchMap(it => this.webhookService.update(spaceId!, element.id, it!)),
      )
      .subscribe({
        next: () => this.notificationService.success('Webhook has been updated.'),
        error: (err: unknown) => {
          console.error(err);
          this.notificationService.error('Webhook can not be updated.');
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
      .open<ConfirmationDialogComponent, ConfirmationDialogModel, boolean>(ConfirmationDialogComponent, {
        data: {
          title: 'Delete Webhook',
          content: `Are you sure about deleting Webhook with name '${element.name}'.`,
        },
      })
      .afterClosed()
      .pipe(
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
