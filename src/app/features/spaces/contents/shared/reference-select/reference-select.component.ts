import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, OnInit, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { provideIcons } from '@ng-icons/core';
import { lucideChevronDown, lucideFileSymlink, lucideTrash } from '@ng-icons/lucide';
import { DIALOG_WIDTH_XL } from '@shared/components/dialog/dialog-width';
import { Content, ContentDocument } from '@shared/models/content.model';
import { SchemaFieldKind, SchemaFieldReference } from '@shared/models/schema.model';
import { Space } from '@shared/models/space.model';
import { ContentService } from '@shared/services/content.service';
import { LocalSettingsStore } from '@shared/stores/local-settings.store';
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
  private readonly contentService = inject(ContentService);

  // Input
  form = input.required<FormGroup>();
  component = input.required<SchemaFieldReference>();
  space = input.required<Space>();

  content = signal<Content | undefined>(undefined);

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
          this.content.set(content);
        },
      });
    }
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
            this.content.set(selectedDocuments[0]);
            this.form().patchValue({
              uri: selectedDocuments[0].id,
              kind: SchemaFieldKind.REFERENCE,
            });
          }
        },
      });
  }

  deleteReference() {
    this.content.set(undefined);
    this.form().controls['uri'].setValue(null);
  }
}
