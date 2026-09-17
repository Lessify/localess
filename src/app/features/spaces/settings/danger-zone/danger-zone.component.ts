import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { provideIcons } from '@ng-icons/core';
import { lucideShredder } from '@ng-icons/lucide';
import {
  CONFIRMATION_DIALOG_CONTENT_CLASS,
  ConfirmationDialogComponent,
  ConfirmationDialogContext,
  ConfirmationDialogResult,
} from '@shared/components/confirmation-dialog';
import { NotificationService } from '@shared/services/notification.service';
import { TranslationService } from '@shared/services/translation.service';
import { SpaceStore } from '@shared/stores/space.store';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { filter, switchMap, take } from 'rxjs/operators';

@Component({
  selector: 'll-space-settings-danger-zone',
  templateUrl: './danger-zone.component.html',
  styleUrls: ['./danger-zone.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, HlmProgressImports, HlmFieldImports, HlmButtonImports, HlmIconImports],
  providers: [
    provideIcons({
      lucideShredder,
    }),
  ],
})
export class DangerZoneComponent {
  private readonly dialog = inject(HlmDialogService);
  private readonly translationService = inject(TranslationService);
  private readonly notificationService = inject(NotificationService);

  isLoading = signal(false);
  spaceStore = inject(SpaceStore);

  private destroyRef = inject(DestroyRef);

  constructor() {}

  deleteTranslations(selectedSpaceId: string) {
    this.dialog
      .open<ConfirmationDialogResult, ConfirmationDialogContext>(ConfirmationDialogComponent, {
        context: {
          title: 'Delete All Translations',
          content: `Are you sure about deleting All Translations.\n This action can not be undone.`,
          variant: 'destructive',
        },
        contentClass: CONFIRMATION_DIALOG_CONTENT_CLASS,
      })
      .closed$.pipe(
        take(1),
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
