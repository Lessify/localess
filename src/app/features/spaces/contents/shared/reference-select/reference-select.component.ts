import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, input, OnInit } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { provideIcons } from '@ng-icons/core';
import { lucideFileSymlink, lucideTrash } from '@ng-icons/lucide';
import { Content, ContentDocument } from '@shared/models/content.model';
import { SchemaFieldKind, SchemaFieldReference } from '@shared/models/schema.model';
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
  selector: 'll-reference-select',
  templateUrl: './reference-select.component.html',
  styleUrls: ['./reference-select.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
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
export class ReferenceSelectComponent implements OnInit {
  readonly fe = inject(FormErrorHandlerService);
  private readonly dialog = inject(MatDialog);
  private readonly cd = inject(ChangeDetectorRef);
  private readonly contentService = inject(ContentService);

  // Input
  form = input.required<FormGroup>();
  component = input.required<SchemaFieldReference>();
  space = input.required<Space>();

  content?: Content;

  // Settings
  settingsStore = inject(LocalSettingsStore);

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
