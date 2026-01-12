import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, effect, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { ConfirmationDialogComponent, ConfirmationDialogModel } from '@shared/components/confirmation-dialog';
import { WebHook, WebHookLog } from '@shared/models/webhook.model';
import { NotificationService } from '@shared/services/notification.service';
import { WebHookService } from '@shared/services/webhook.service';
import { SpaceStore } from '@shared/stores/space.store';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { filter, switchMap } from 'rxjs/operators';
import { WebhookDialogComponent } from './webhook-dialog/webhook-dialog.component';
import { WebhookDialogModel } from './webhook-dialog/webhook-dialog.model';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { HlmSheetImports } from '@spartan-ng/helm/sheet';
import { BrnSheetImports } from '@spartan-ng/brain/sheet';
import { HlmScrollAreaImports } from '@spartan-ng/helm/scroll-area';
import { NgScrollbarModule } from 'ngx-scrollbar';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { provideIcons } from '@ng-icons/core';
import { lucidePlus, lucideShieldAlert } from '@ng-icons/lucide';
import { HlmItemImports } from '@spartan-ng/helm/item';
import { Observable } from 'rxjs';

@Component({
  selector: 'll-space-settings-webhooks',
  templateUrl: './webhooks.component.html',
  styleUrls: ['./webhooks.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatSortModule,
    CommonModule,
    MatPaginatorModule,
    HlmProgressImports,
    HlmBadgeImports,
    HlmTooltipImports,
    HlmSheetImports,
    BrnSheetImports,
    HlmScrollAreaImports,
    NgScrollbarModule,
    HlmButtonImports,
    HlmIconImports,
    HlmItemImports,
  ],
  providers: [
    provideIcons({
      lucidePlus,
      lucideShieldAlert,
    }),
  ],
})
export class WebhooksComponent {
  private readonly webhookService = inject(WebHookService);
  private readonly dialog = inject(MatDialog);
  private readonly cd = inject(ChangeDetectorRef);
  private readonly notificationService = inject(NotificationService);

  sort = viewChild.required(MatSort);
  paginator = viewChild.required(MatPaginator);

  isLoading = signal(true);
  spaceStore = inject(SpaceStore);

  dataSource: MatTableDataSource<WebHook> = new MatTableDataSource<WebHook>([]);
  displayedColumns: string[] = ['name', 'enabled', 'events', 'updatedAt', 'actions'];

  // Sheet state and selected webhook for logs
  protected readonly isLogsSheetOpen = signal(false);
  protected readonly selectedWebhook = signal<WebHook | null>(null);

  // Subscriptions
  logs$?: Observable<WebHookLog[]>;

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
    effect(() => {
      const spaceId = this.spaceStore.selectedSpaceId();
      const webhook = this.selectedWebhook();
      if (spaceId && webhook) {
        this.logs$ = this.webhookService.findLogs(spaceId, webhook.id).pipe(takeUntilDestroyed(this.destroyRef));
      }
    });
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
        next: () => {
          this.notificationService.success('Webhook has been created.');
        },
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
        next: () => {
          this.notificationService.success('Webhook has been updated.');
        },
        error: (err: unknown) => {
          console.error(err);
          this.notificationService.error('Webhook can not be updated.');
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
        next: () => {
          this.notificationService.success(`Webhook '${element.name}' has been deleted.`);
        },
        error: () => {
          this.notificationService.error(`Webhook '${element.name}' can not be deleted.`);
        },
      });
  }

  openLogsSheet(webhook: WebHook) {
    this.selectedWebhook.set(webhook);
    this.isLogsSheetOpen.set(true);
    //this.logs$ = this.webhookService.findLogs();
  }

  closeLogsSheet() {
    this.isLogsSheetOpen.set(false);
    this.selectedWebhook.set(null);
  }
}
