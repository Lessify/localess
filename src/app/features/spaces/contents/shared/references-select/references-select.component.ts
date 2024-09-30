import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, input, OnInit, output } from '@angular/core';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { SchemaFieldKind, SchemaFieldReferences } from '@shared/models/schema.model';
import { Content, ContentDocument, ContentKind } from '@shared/models/content.model';
import { LocalSettingsStore } from '@shared/stores/local-settings.store';
import { MatDialog } from '@angular/material/dialog';
import { ReferencesSelectDialogComponent, ReferencesSelectDialogModel } from '@shared/components/references-select-dialog';
import { Space } from '@shared/models/space.model';
import { ContentService } from '@shared/services/content.service';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

@Component({
  selector: 'll-references-select',
  templateUrl: './references-select.component.html',
  styleUrls: ['./references-select.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReferencesSelectComponent implements OnInit {
  // Input
  form = input.required<FormArray>();
  component = input.required<SchemaFieldReferences>();
  space = input.required<Space>();
  // Outputs
  onReferencesChange = output<string[]>();

  contents: ContentDocument[] = [];
  // Settings
  settingsStore = inject(LocalSettingsStore);

  constructor(
    private readonly fb: FormBuilder,
    readonly fe: FormErrorHandlerService,
    private readonly dialog: MatDialog,
    private readonly cd: ChangeDetectorRef,
    private readonly contentService: ContentService,
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    const ids: string[] | undefined = this.form().controls.map(it => it.value.uri as string);
    if (ids && ids.length > 0) {
      this.contentService.findByIds(this.space().id, ids).subscribe({
        next: contents => {
          const byId = new Map<string, Content>(contents.map(item => [item.id, item]));
          // Make sure to have assets display in exactly the same order
          this.contents = ids
            .map(it => byId.get(it))
            .filter(content => content?.kind === ContentKind.DOCUMENT)
            .map(it => it as ContentDocument);
          this.cd.markForCheck();
        },
      });
    }
  }

  openReferenceSelectDialog(): void {
    this.dialog
      .open<ReferencesSelectDialogComponent, ReferencesSelectDialogModel, ContentDocument[] | undefined>(ReferencesSelectDialogComponent, {
        minWidth: '900px',
        width: 'calc(100vw - 160px)',
        maxWidth: '1280px',
        maxHeight: 'calc(100vh - 80px)',
        data: {
          spaceId: this.space().id,
          multiple: true,
        },
      })
      .afterClosed()
      .subscribe({
        next: selectedDocuments => {
          if (selectedDocuments) {
            this.contents.push(...selectedDocuments);
            this.form().clear();
            this.contents.forEach(it => this.form().push(this.documentToForm(it)));
            this.onReferencesChange.emit(this.contents.map(it => it.id));
          }
          this.cd.markForCheck();
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
    this.contents.splice(idx, 1);
    this.form().removeAt(idx);
    this.onReferencesChange.emit(this.contents.map(it => it.id));
  }

  referenceDropDrop(event: CdkDragDrop<string[]>) {
    if (event.previousIndex === event.currentIndex) return;
    const tmp = this.form().at(event.previousIndex);
    if (tmp) {
      this.form().removeAt(event.previousIndex);
      this.form().insert(event.currentIndex, tmp);
      moveItemInArray(this.contents, event.previousIndex, event.currentIndex);
      this.onReferencesChange.emit(this.contents.map(it => it.id));
    }
  }
}
