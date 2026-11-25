import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { LocalSettingsStore } from '@core/stores/local-settings.store';
import { SpaceStore } from '@core/stores/space.store';
import { ContentDocumentWithPath } from '@core/utils/content-summaries';
import { ContentDocument, ContentKind, SchemaFieldKind, SchemaFieldReferences, Space } from '@localess/shared';
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
  selector: 'll-references-select',
  templateUrl: './references-select.component.html',
  styleUrls: ['./references-select.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DragDropModule,
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
export class ReferencesSelectComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly fe = inject(FormErrorHandlerService);
  private readonly dialog = inject(HlmDialogService);
  private readonly spaceStore = inject(SpaceStore);

  // Input
  form = input.required<FormArray>();
  component = input.required<SchemaFieldReferences>();
  space = input.required<Space>();
  /** Shared, non-translatable value viewed outside the default locale: shown, but not editable. */
  locked = input(false);
  // Outputs
  referencesChange = output<string[]>();

  /** The ids picked, in their order (the form's values). */
  readonly ids = signal<string[]>([]);
  /** The documents picked, from `SpaceStore` (live: a rename or a publish shows at once); one gone is left out. */
  readonly contents = computed(() =>
    this.ids()
      .map(id => this.spaceStore.contentById().get(id))
      .filter((it): it is ContentDocumentWithPath => it?.kind === ContentKind.DOCUMENT),
  );
  // Settings
  settingsStore = inject(LocalSettingsStore);

  ngOnInit(): void {
    this.ids.set(
      this.form()
        .controls.map(it => it.value.uri as string)
        .filter(Boolean),
    );
  }

  openReferenceSelectDialog(): void {
    this.dialog
      .open<ContentDocument[], ReferencesSelectDialogContext>(ReferencesSelectDialogComponent, {
        context: {
          spaceId: this.space().id,
          multiple: true,
        },
        contentClass: DIALOG_WIDTH_XL,
      })
      .closed$.pipe(take(1))
      .subscribe({
        next: selectedDocuments => {
          if (selectedDocuments) {
            this.ids.update(current => [...current, ...selectedDocuments.map(it => it.id)]);
            this.form().clear();
            this.ids().forEach(id => this.form().push(this.documentToForm(id)));
            this.referencesChange.emit(this.ids());
          }
        },
      });
  }

  documentToForm(id: string): FormGroup {
    return this.fb.group({
      uri: this.fb.control(id),
      kind: this.fb.control(SchemaFieldKind.REFERENCE),
    });
  }

  /** By id: a document gone from the space is not shown, so the list's index is not the form's. */
  deleteReference(id: string) {
    const index = this.ids().indexOf(id);
    if (index < 0) return;
    this.ids.update(current => current.filter((_, i) => i !== index));
    this.form().removeAt(index);
    this.referencesChange.emit(this.ids());
  }

  /** The list's positions turned into the form's (see `deleteReference`). */
  referenceDropDrop(event: CdkDragDrop<string[]>) {
    if (event.previousIndex === event.currentIndex) return;
    const shown = this.contents();
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
    this.referencesChange.emit(this.ids());
  }
}
