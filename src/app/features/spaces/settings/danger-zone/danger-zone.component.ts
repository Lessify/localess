import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { NotificationService } from '@shared/services/notification.service';
import { SpaceStore } from '@shared/stores/space.store';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogComponent, ConfirmationDialogModel } from '@shared/components/confirmation-dialog';
import { filter, switchMap } from 'rxjs/operators';
import { TranslationService } from '@shared/services/translation.service';

@Component({
  selector: 'll-space-settings-danger-zone',
  templateUrl: './danger-zone.component.html',
  styleUrls: ['./danger-zone.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, HlmProgressImports, HlmFieldImports, HlmButtonImports],
})
export class DangerZoneComponent {
  private readonly dialog = inject(MatDialog);
  private readonly translationService = inject(TranslationService);
  private readonly notificationService = inject(NotificationService);

  isLoading = signal(false);
  spaceStore = inject(SpaceStore);

  private destroyRef = inject(DestroyRef);

  constructor() {}

  deleteTranslations(selectedSpaceId: string) {
    this.dialog
      .open<ConfirmationDialogComponent, ConfirmationDialogModel, boolean>(ConfirmationDialogComponent, {
        data: {
          title: 'Delete All Translations',
          content: `Are you sure about deleting All Translations.\n This action can not be undone.`,
        },
      })
      .afterClosed()
      .pipe(
        filter(it => it || false),
        switchMap(() => this.translationService.deleteAll(selectedSpaceId)),
      )
      .subscribe({
        next: () => {
          this.notificationService.success('All Translations deleted process, have successfully started');
        },
        error: () => {
          this.notificationService.error('Failed to delete All Translations');
        },
      });
  }
}
