import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal } from '@angular/core';
import { NotificationService } from '@core/services/notification.service';
import { SpaceService } from '@core/services/space.service';
import { SpaceStore } from '@core/stores/space.store';
import { resolvePreviewUrl } from '@core/utils/preview-url';
import { SpaceEnvironment } from '@localess/shared';
import { provideIcons } from '@ng-icons/core';
import { lucideGripVertical, lucidePencil, lucidePlus, lucideTrash } from '@ng-icons/lucide';
import {
  CONFIRMATION_DIALOG_CONTENT_CLASS,
  ConfirmationDialogComponent,
  ConfirmationDialogContext,
  ConfirmationDialogResult,
} from '@shared/components/confirmation-dialog';
import { SAMPLE_PREVIEW_CONTEXT } from '@shared/validators/space.validator';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmItemImports } from '@spartan-ng/helm/item';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { filter, switchMap, take } from 'rxjs/operators';

import { EnvironmentDialogComponent } from './environment-dialog/environment-dialog.component';
import { EnvironmentDialogContext, EnvironmentDialogResult } from './environment-dialog/environment-dialog.model';

/**
 * Visual Editor preview environments, managed one by one: add and edit in a dialog, delete with a confirmation, reorder
 * by drag and drop (the first is the default). Every change is saved at once; the list follows the space.
 */
@Component({
  selector: 'll-space-settings-visual-editor',
  templateUrl: './visual-editor.component.html',
  styleUrls: ['./visual-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DragDropModule, HlmProgressImports, HlmButtonImports, HlmIconImports, HlmItemImports, HlmTooltipImports],
  providers: [provideIcons({ lucidePlus, lucidePencil, lucideTrash, lucideGripVertical })],
})
export class VisualEditorComponent {
  private readonly spaceService = inject(SpaceService);
  private readonly notificationService = inject(NotificationService);
  private readonly hlmDialog = inject(HlmDialogService);
  readonly spaceStore = inject(SpaceStore);

  readonly isLoading = computed(() => this.spaceStore.selectedSpace() === undefined);
  /** The space's environments; a drop reorders this copy at once, the server's answer then replaces it. */
  readonly environments = linkedSignal<SpaceEnvironment[]>(() => this.spaceStore.selectedSpace()?.environments ?? []);

  /** What an environment URL opens for the sample document. */
  exampleUrl(url: string): string {
    return resolvePreviewUrl(url, SAMPLE_PREVIEW_CONTEXT);
  }

  openAddDialog(): void {
    const spaceId = this.spaceStore.selectedSpaceId();
    if (!spaceId) return;
    this.openDialog(undefined)
      .pipe(switchMap(it => this.spaceService.createEnvironment(spaceId, it)))
      .subscribe({
        next: () => this.notificationService.success('Environment has been added.'),
        error: () => this.notificationService.error('Environment can not be added.'),
      });
  }

  openEditDialog(environment: SpaceEnvironment): void {
    const spaceId = this.spaceStore.selectedSpaceId();
    if (!spaceId) return;
    this.openDialog({ name: environment.name, url: environment.url })
      .pipe(switchMap(it => this.spaceService.updateEnvironment(spaceId, environment.id, it)))
      .subscribe({
        next: () => this.notificationService.success(`Environment '${environment.name}' has been updated.`),
        error: () => this.notificationService.error(`Environment '${environment.name}' can not be updated.`),
      });
  }

  openDeleteDialog(environment: SpaceEnvironment): void {
    const spaceId = this.spaceStore.selectedSpaceId();
    if (!spaceId) return;
    this.hlmDialog
      .open<ConfirmationDialogResult, ConfirmationDialogContext>(ConfirmationDialogComponent, {
        context: {
          title: 'Delete Environment',
          content: `Are you sure about deleting Environment '${environment.name}' (${environment.url})?`,
          variant: 'destructive',
        },
        contentClass: CONFIRMATION_DIALOG_CONTENT_CLASS,
      })
      .closed$.pipe(
        take(1),
        filter(it => it || false),
        switchMap(() => this.spaceService.deleteEnvironment(spaceId, environment.id)),
      )
      .subscribe({
        next: () => this.notificationService.success(`Environment '${environment.name}' has been deleted.`),
        error: () => this.notificationService.error(`Environment '${environment.name}' can not be deleted.`),
      });
  }

  drop(event: CdkDragDrop<SpaceEnvironment[]>): void {
    const spaceId = this.spaceStore.selectedSpaceId();
    if (!spaceId || event.previousIndex === event.currentIndex) return;
    const before = this.environments();
    const reordered = [...before];
    moveItemInArray(reordered, event.previousIndex, event.currentIndex);
    this.environments.set(reordered);
    this.spaceService
      .reorderEnvironments(
        spaceId,
        reordered.map(it => it.id),
      )
      .subscribe({
        error: () => {
          this.environments.set(before);
          this.notificationService.error('Environments can not be reordered.');
        },
      });
  }

  /**
   * `closed$` does not complete the way `afterClosed()` does, hence `take(1)`; a dismissed dialog closes with
   * `undefined`.
   */
  private openDialog(context: EnvironmentDialogContext | undefined) {
    return this.hlmDialog
      .open<EnvironmentDialogResult, EnvironmentDialogContext>(EnvironmentDialogComponent, {
        context,
        contentClass: 'w-lg! max-w-lg!',
      })
      .closed$.pipe(
        take(1),
        filter((it): it is EnvironmentDialogResult => it !== undefined),
      );
  }
}
