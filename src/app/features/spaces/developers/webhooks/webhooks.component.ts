import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { Router } from '@angular/router';
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
    MatTableModule,
    MatSortModule,
    CommonModule,
    MatPaginatorModule,
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
  private readonly dialog = inject(MatDialog);
  private readonly cd = inject(ChangeDetectorRef);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  sort = viewChild.required(MatSort);
  paginator = viewChild.required(MatPaginator);

  isLoading = signal(true);
  spaceStore = inject(SpaceStore);

  dataSource: MatTableDataSource<WebHook> = new MatTableDataSource<WebHook>([]);
  displayedColumns: string[] = ['name', 'enabled', 'events', 'updatedAt', 'actions'];

  private destroyRef = inject(DestroyRef);

  constructor() {
    toObservable(this.spaceStore.selectedSpace)
      .pipe(
        filter(it => it !== undefined),
        switchMap(it => this.webhookService.findAll(it!.id)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: webhooks => {
          this.dataSource = new MatTableDataSource<WebHook>(webhooks);
          this.dataSource.sort = this.sort();
          this.dataSource.paginator = this.paginator();
          this.isLoading.set(false);
          this.cd.markForCheck();
        },
      });
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
