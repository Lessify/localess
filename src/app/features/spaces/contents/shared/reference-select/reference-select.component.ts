import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, input, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { SchemaFieldKind, SchemaFieldReference } from '@shared/models/schema.model';
import { Content, ContentDocument } from '@shared/models/content.model';
import { LocalSettingsStore } from '@shared/store/local-settings.store';
import { Space } from '@shared/models/space.model';
import { MatDialog } from '@angular/material/dialog';
import { ContentService } from '@shared/services/content.service';
import { ReferencesSelectDialogComponent, ReferencesSelectDialogModel } from '@shared/components/references-select-dialog';

@Component({
  selector: 'll-reference-select',
  templateUrl: './reference-select.component.html',
  styleUrls: ['./reference-select.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReferenceSelectComponent implements OnInit {
  // Input
  form = input.required<FormGroup>();
  component = input.required<SchemaFieldReference>();
  space = input.required<Space>();

  content?: Content;

  // Settings
  settingsStore = inject(LocalSettingsStore);

  constructor(
    readonly fe: FormErrorHandlerService,
    private readonly dialog: MatDialog,
    private readonly cd: ChangeDetectorRef,
    private readonly contentService: ContentService,
  ) {}

  ngOnInit(): void {
    if (this.form().value.kind === null) {
      this.form().patchValue({ kind: SchemaFieldKind.REFERENCE });
    }
    this.loadData();
  }

  loadData(): void {
    const id: string | undefined = this.form().value.uri;
    if (id) {
      this.contentService.findById(this.space().id, id).subscribe({
        next: content => {
          this.content = content;
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
          multiple: false,
        },
      })
      .afterClosed()
      .subscribe({
        next: selectedDocuments => {
          if (selectedDocuments && selectedDocuments.length > 0) {
            this.content = undefined;
            this.cd.detectChanges();
            this.content = selectedDocuments[0];
            this.form().patchValue({
              uri: this.content.id,
              kind: SchemaFieldKind.REFERENCE,
            });
            this.cd.markForCheck();
          }
        },
      });
  }

  deleteReference() {
    this.content = undefined;
    this.form().controls['uri'].setValue(null);
  }
}
