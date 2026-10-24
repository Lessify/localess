import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { LocalSettingsStore } from '@core/stores/local-settings.store';
import { SpaceStore } from '@core/stores/space.store';
import { assetFieldFileType, AssetFile, AssetFileSummary, SchemaFieldAsset, SchemaFieldKind, Space } from '@localess/shared';
import { provideIcons } from '@ng-icons/core';
import { lucideChevronDown, lucideFile, lucideFilePlusCorner, lucideLanguages, lucideTrash } from '@ng-icons/lucide';
import { DIALOG_WIDTH_FULL_SCREEN, DIALOG_WIDTH_IMAGE_PREVIEW } from '@shared/components/dialog/dialog-width';
import { ImagePreviewDialogComponent } from '@shared/components/image-preview-dialog/image-preview-dialog.component';
import { ImagePreviewDialogContext } from '@shared/components/image-preview-dialog/image-preview-dialog.model';
import { ImagePreviewDirective } from '@shared/directives/image-preview.directive';
import { filePreview } from '@shared/models/asset.model';
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
  selector: 'll-asset-select',
  templateUrl: './asset-select.component.html',
  styleUrls: ['./asset-select.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    CommonModule,
    ImagePreviewDirective,
    FormatFileSizePipe,
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
      lucideFile,
      lucideLanguages,
      lucideChevronDown,
    }),
  ],
})
export class AssetSelectComponent implements OnInit {
  readonly fe = inject(FormErrorHandlerService);
  private readonly dialog = inject(HlmDialogService);

  // Input
  form = input.required<FormGroup>();
  component = input.required<SchemaFieldAsset>();
  space = input.required<Space>();
  /** Shared, non-translatable value viewed outside the default locale: shown, but not editable. */
  locked = input(false);
  hover = input(false);
  private readonly spaceStore = inject(SpaceStore);
  /** Images and videos show their thumbnail; other files an icon. */
  protected readonly filePreview = filePreview;
  /** The id picked (the form's value). */
  readonly id = signal<string | undefined>(undefined);
  /** The file picked, from `SpaceStore` (live: a rename or a new image shows at once); none when it is gone. */
  readonly asset = computed(() => {
    const id = this.id();
    return id ? this.spaceStore.assetFileById().get(id) : undefined;
  });

  //Settings
  settingsStore = inject(LocalSettingsStore);

  ngOnInit(): void {
    if (this.form().value.kind === null) {
      this.form().patchValue({ kind: SchemaFieldKind.ASSET });
    }
    this.spaceStore.loadAssetFiles();
    this.id.set(this.form().value.uri || undefined);
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
          multiple: false,
          fileType: assetFieldFileType(this.component()),
        },
        contentClass: DIALOG_WIDTH_FULL_SCREEN,
      })
      .closed$.pipe(take(1))
      .subscribe({
        next: selectedAssets => {
          if (selectedAssets && selectedAssets.length > 0) {
            this.id.set(selectedAssets[0].id);
            this.form().patchValue({
              uri: selectedAssets[0].id,
              kind: SchemaFieldKind.ASSET,
            });
          }
        },
      });
  }

  deleteAsset() {
    this.id.set(undefined);
    this.form().controls['uri'].setValue(null);
    //this.form?.reset();
  }
}
