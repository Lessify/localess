import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { FormArray, FormBuilder, Validators } from '@angular/forms';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { SchemaFieldKind, SchemaFieldReferences } from '@shared/models/schema.model';
import { ContentDocument } from '@shared/models/content.model';
import { SettingsStore } from '@shared/store/settings.store';

@Component({
  selector: 'll-references-select',
  templateUrl: './references-select.component.html',
  styleUrls: ['./references-select.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReferencesSelectComponent {
  // Input
  form = input.required<FormArray>();
  component = input.required<SchemaFieldReferences>();
  documents = input.required<ContentDocument[]>();

  // Subscriptions
  settingsStore = inject(SettingsStore);

  constructor(
    private readonly fb: FormBuilder,
    readonly fe: FormErrorHandlerService
  ) {}

  addReference() {
    this.form().push(
      this.fb.group({
        kind: this.fb.control(SchemaFieldKind.REFERENCE, Validators.required),
        uri: this.fb.control<string | undefined>(
          {
            value: undefined,
            disabled: false, //disabled
          },
          Validators.required
        ),
      })
    );
  }

  deleteReference(idx: number) {
    this.form().removeAt(idx);
  }
}
