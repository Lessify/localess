import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { LocalSettingsStore } from '@core/stores/local-settings.store';
import { SpaceStore } from '@core/stores/space.store';
import { assetFieldFileType, AssetFile, AssetFileSummary, SchemaFieldAssets, SchemaFieldKind, Space } from '@localess/shared';
import { provideIcons } from '@ng-icons/core';
import { lucideChevronDown, lucideFile, lucideFilePlusCorner, lucideGripVertical, lucideLanguages, lucideTrash } from '@ng-icons/lucide';
import { DIALOG_WIDTH_FULL_SCREEN, DIALOG_WIDTH_IMAGE_PREVIEW } from '@shared/components/dialog/dialog-width';
import { ImagePreviewDialogComponent } from '@shared/components/image-preview-dialog/image-preview-dialog.component';
import { ImagePreviewDialogContext } from '@shared/components/image-preview-dialog/image-preview-dialog.model';
import { ImagePreviewDirective } from '@shared/directives/image-preview.directive';
import { FormatFileSizePipe } from '@shared/pipes/digital-store.pipe';
import { HlmAccordionImports } from '@spartan-ng/helm/accordion';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmItemImports } from '@spartan-ng/helm/item';
import { HlmSeparatorImports } from '@spartan-ng/helm/separator';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { take } from 'rxjs/operators';

import { AssetsSelectDialogComponent, AssetsSelectDialogContext } from '../assets-select-dialog';

@Component({
  selector: 'll-assets-select',
  templateUrl: './assets-select.component.html',
  styleUrls: ['./assets-select.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DragDropModule,
    ImagePreviewDirective,
    CommonModule,
    FormatFileSizePipe,
    NgOptimizedImage,
    HlmButtonImports,
    HlmFieldImports,
    HlmIconImports,
    HlmTooltipImports,
    HlmItemImports,
    HlmSeparatorImports,
    HlmAccordionImports,
  ],
  providers: [
    provideIcons({
      lucideFilePlusCorner,
      lucideTrash,
      lucideGripVertical,
      lucideFile,
      lucideLanguages,
      lucideChevronDown,
    }),
  ],
})
export class AssetsSelectComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly fe = inject(FormErrorHandlerService);
  private readonly dialog = inject(HlmDialogService);

  // Inputs
  form = input.required<FormArray>();
  component = input.required<SchemaFieldAssets>();
  space = input.required<Space>();
  /** Shared, non-translatable value viewed outside the default locale: shown, but not editable. */
  locked = input(false);
  // Outputs
  assetsChange = output<string[]>();

  private readonly spaceStore = inject(SpaceStore);
  /** The ids picked, in their order (the form's values). */
  readonly ids = signal<string[]>([]);
  /** The files picked, from `SpaceStore` (live: a rename or a new image shows at once); one gone is left out. */
  readonly assets = computed(() =>
    this.ids().flatMap(id => {
      const file = this.spaceStore.assetFileById().get(id);
      return file ? [file] : [];
    }),
  );
  // Settings
  settingsStore = inject(LocalSettingsStore);

  ngOnInit(): void {
    this.spaceStore.loadAssetFiles();
    this.ids.set(
      this.form()
        .controls.map(it => it.value.uri as string)
        .filter(Boolean),
    );
  }

  openImagePreview(element: AssetFileSummary): void {
    this.dialog
      .open<void, ImagePreviewDialogContext>(ImagePreviewDialogComponent, {
        context: {
          spaceId: this.space().id,
          asset: element,
        },
        contentClass: DIALOG_WIDTH_IMAGE_PREVIEW,
      })
      .closed$.pipe(take(1))
      .subscribe({
        next: () => {
          console.log('close');
        },
      });
  }

  openAssetSelectDialog(): void {
    this.dialog
      .open<AssetFile[], AssetsSelectDialogContext>(AssetsSelectDialogComponent, {
        context: {
          spaceId: this.space().id,
          multiple: true,
          fileType: assetFieldFileType(this.component()),
        },
        contentClass: DIALOG_WIDTH_FULL_SCREEN,
      })
      .closed$.pipe(take(1))
      .subscribe({
        next: selectedAssets => {
          if (selectedAssets) {
            this.ids.update(current => [...current, ...selectedAssets.map(it => it.id)]);
            this.form().clear();
            this.ids().forEach(id => this.form().push(this.assetToForm(id)));
            this.assetsChange.emit(this.ids());
          }
        },
      });
  }

  assetToForm(id: string): FormGroup {
    return this.fb.group({
      uri: this.fb.control(id),
      kind: this.fb.control(SchemaFieldKind.ASSET),
    });
  }

  /** By id: a file gone from the space is not shown, so the list's index is not the form's. */
  deleteAsset(id: string) {
    const index = this.ids().indexOf(id);
    if (index < 0) return;
    this.ids.update(current => current.filter((_, i) => i !== index));
    this.form().removeAt(index);
    this.assetsChange.emit(this.ids());
  }

  /** The list's positions turned into the form's (see `deleteAsset`). */
  assetDropDrop(event: CdkDragDrop<string[]>) {
    if (event.previousIndex === event.currentIndex) return;
    const shown = this.assets();
    const from = this.ids().indexOf(shown[event.previousIndex]?.id ?? '');
    const to = this.ids().indexOf(shown[event.currentIndex]?.id ?? '');
    if (from < 0 || to < 0) return;
    const control = this.form().at(from);
    this.form().removeAt(from);
    this.form().insert(to, control);
    this.ids.update(current => {
      const arr = [...current];
      moveItemInArray(arr, from, to);
      return arr;
    });
    this.assetsChange.emit(this.ids());
  }
}
