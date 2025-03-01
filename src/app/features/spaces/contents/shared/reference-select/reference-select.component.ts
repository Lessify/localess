import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, input, OnInit } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { SchemaFieldKind, SchemaFieldReference } from '@shared/models/schema.model';
import { Content, ContentDocument } from '@shared/models/content.model';
import { LocalSettingsStore } from '@shared/stores/local-settings.store';
import { Space } from '@shared/models/space.model';
import { MatDialog } from '@angular/material/dialog';
import { ContentService } from '@shared/services/content.service';
import { ReferencesSelectDialogComponent, ReferencesSelectDialogModel } from '@shared/components/references-select-dialog';
import { MatCard, MatCardModule } from '@angular/material/card';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { MatDivider } from '@angular/material/divider';
import { MatList, MatListModule } from '@angular/material/list';
import { StatusComponent } from '@shared/components/status';
import { MatError } from '@angular/material/form-field';
import { MatExpansionModule, MatExpansionPanel } from '@angular/material/expansion';
import { JsonPipe } from '@angular/common';

@Component({
  selector: 'll-reference-select',
  standalone: true,
  templateUrl: './reference-select.component.html',
  styleUrls: ['./reference-select.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatIconButton,
    MatIcon,
    MatTooltip,
    MatDivider,
    MatListModule,
    StatusComponent,
    MatError,
    MatExpansionModule,
    JsonPipe,
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
