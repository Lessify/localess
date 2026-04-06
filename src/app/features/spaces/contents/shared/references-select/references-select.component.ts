import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, OnInit, output, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { provideIcons } from '@ng-icons/core';
import { lucideFileSymlink, lucideTrash } from '@ng-icons/lucide';
import { Content, ContentDocument, ContentKind } from '@shared/models/content.model';
import { SchemaFieldKind, SchemaFieldReferences } from '@shared/models/schema.model';
import { Space } from '@shared/models/space.model';
import { ContentService } from '@shared/services/content.service';
import { LocalSettingsStore } from '@shared/stores/local-settings.store';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmItemImports } from '@spartan-ng/helm/item';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';

import { DocumentStatusComponent } from '../document-status/document-status.component';
import { ReferencesSelectDialogComponent, ReferencesSelectDialogModel } from '../references-select-dialog';

@Component({
  selector: 'll-references-select',
  templateUrl: './references-select.component.html',
  styleUrls: ['./references-select.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DragDropModule,
    MatExpansionModule,
    CommonModule,
    HlmButtonImports,
    HlmFieldImports,
    HlmIconImports,
    HlmTooltipImports,
    HlmItemImports,
    DocumentStatusComponent,
  ],
  providers: [
    provideIcons({
      lucideFileSymlink,
      lucideTrash,
    }),
  ],
})
export class ReferencesSelectComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly fe = inject(FormErrorHandlerService);
  private readonly dialog = inject(MatDialog);
  private readonly contentService = inject(ContentService);

  // Input
  form = input.required<FormArray>();
  component = input.required<SchemaFieldReferences>();
  space = input.required<Space>();
  // Outputs
  referencesChange = output<string[]>();

  contents = signal<ContentDocument[]>([]);
  // Settings
  settingsStore = inject(LocalSettingsStore);

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    const ids: string[] | undefined = this.form().controls.map(it => it.value.uri as string);
    if (ids && ids.length > 0) {
      this.contentService.findByIds(this.space().id, ids).subscribe({
        next: contents => {
          const byId = new Map<string, Content>(contents.map(item => [item.id, item]));
          // Make sure to have contents display in exactly the same order
          this.contents.set(
            ids
              .map(it => byId.get(it))
              .filter(content => content?.kind === ContentKind.DOCUMENT)
              .map(it => it as ContentDocument),
          );
        },
      });
    }
  }

  openReferenceSelectDialog(): void {
    this.dialog
      .open<ReferencesSelectDialogComponent, ReferencesSelectDialogModel, ContentDocument[] | undefined>(ReferencesSelectDialogComponent, {
        panelClass: 'xl',
        data: {
          spaceId: this.space().id,
          multiple: true,
        },
      })
      .afterClosed()
      .subscribe({
        next: selectedDocuments => {
          if (selectedDocuments) {
            this.contents.update(current => [...current, ...selectedDocuments]);
            this.form().clear();
            this.contents().forEach(it => this.form().push(this.documentToForm(it)));
            this.referencesChange.emit(this.contents().map(it => it.id));
          }
        },
      });
  }

  documentToForm(document: ContentDocument): FormGroup {
    return this.fb.group({
      uri: this.fb.control(document.id),
      kind: this.fb.control(SchemaFieldKind.REFERENCE),
    });
  }

  deleteReference(idx: number) {
    this.contents.update(current => current.filter((_, i) => i !== idx));
    this.form().removeAt(idx);
    this.referencesChange.emit(this.contents().map(it => it.id));
  }

  referenceDropDrop(event: CdkDragDrop<string[]>) {
    if (event.previousIndex === event.currentIndex) return;
    const tmp = this.form().at(event.previousIndex);
    if (tmp) {
      this.form().removeAt(event.previousIndex);
      this.form().insert(event.currentIndex, tmp);
      this.contents.update(current => {
        const arr = [...current];
        moveItemInArray(arr, event.previousIndex, event.currentIndex);
        return arr;
      });
      this.referencesChange.emit(this.contents().map(it => it.id));
    }
  }
}
