import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { LocalSettingsStore } from '@core/stores/local-settings.store';
import { SpaceStore } from '@core/stores/space.store';
import { ContentDocument, SchemaFieldKind, SchemaFieldReference, Space } from '@localess/shared';
import { provideIcons } from '@ng-icons/core';
import { lucideChevronDown, lucideFileSymlink, lucideTrash } from '@ng-icons/lucide';
import { DIALOG_WIDTH_XL } from '@shared/components/dialog/dialog-width';
import { HlmAccordionImports } from '@spartan-ng/helm/accordion';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmItemImports } from '@spartan-ng/helm/item';
import { HlmSeparatorImports } from '@spartan-ng/helm/separator';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { take } from 'rxjs';

import { DocumentStatusComponent } from '../document-status/document-status.component';
import { ReferencesSelectDialogComponent, ReferencesSelectDialogContext } from '../references-select-dialog';

@Component({
  selector: 'll-reference-select',
  templateUrl: './reference-select.component.html',
  styleUrls: ['./reference-select.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    CommonModule,
    HlmButtonImports,
    HlmFieldImports,
    HlmIconImports,
    HlmTooltipImports,
    HlmItemImports,
    DocumentStatusComponent,
    HlmSeparatorImports,
    HlmAccordionImports,
  ],
  providers: [
    provideIcons({
      lucideFileSymlink,
      lucideTrash,
      lucideChevronDown,
    }),
  ],
})
export class ReferenceSelectComponent implements OnInit {
  readonly fe = inject(FormErrorHandlerService);
  private readonly dialog = inject(HlmDialogService);
  private readonly spaceStore = inject(SpaceStore);

  // Input
  form = input.required<FormGroup>();
  component = input.required<SchemaFieldReference>();
  space = input.required<Space>();
  /** Shared, non-translatable value viewed outside the default locale: shown, but not editable. */
  locked = input(false);

  /** The id picked (the form's value). */
  readonly id = signal<string | undefined>(undefined);
  /** The document picked, from `SpaceStore` (live); `undefined` when none, or gone from the space. */
  readonly content = computed(() => {
    const id = this.id();
    return id ? this.spaceStore.contentById().get(id) : undefined;
  });

  // Settings
  settingsStore = inject(LocalSettingsStore);

  ngOnInit(): void {
    if (this.form().value.kind === null) {
      this.form().patchValue({ kind: SchemaFieldKind.REFERENCE });
    }
    this.id.set(this.form().value.uri || undefined);
  }

  openReferenceSelectDialog(): void {
    this.dialog
      .open<ContentDocument[], ReferencesSelectDialogContext>(ReferencesSelectDialogComponent, {
        context: {
          spaceId: this.space().id,
          multiple: false,
        },
        contentClass: DIALOG_WIDTH_XL,
      })
      .closed$.pipe(take(1))
      .subscribe({
        next: selectedDocuments => {
          if (selectedDocuments && selectedDocuments.length > 0) {
            this.id.set(selectedDocuments[0].id);
            this.form().patchValue({
              uri: selectedDocuments[0].id,
              kind: SchemaFieldKind.REFERENCE,
            });
          }
        },
      });
  }

  deleteReference() {
    this.id.set(undefined);
    this.form().controls['uri'].setValue(null);
  }
}
