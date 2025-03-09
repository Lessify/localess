import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, input, OnInit } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatError } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { ReferencesSelectDialogComponent, ReferencesSelectDialogModel } from '@shared/components/references-select-dialog';
import { StatusComponent } from '@shared/components/status';
import { Content, ContentDocument } from '@shared/models/content.model';
import { SchemaFieldKind, SchemaFieldReference } from '@shared/models/schema.model';
import { Space } from '@shared/models/space.model';
import { ContentService } from '@shared/services/content.service';
import { LocalSettingsStore } from '@shared/stores/local-settings.store';

@Component({
  selector: 'll-reference-select',
  standalone: true,
  templateUrl: './reference-select.component.html',
  styleUrls: ['./reference-select.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatDividerModule,
    MatListModule,
    StatusComponent,
    MatError,
    MatExpansionModule,
    CommonModule,
  ],
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
        panelClass: 'xl',
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
