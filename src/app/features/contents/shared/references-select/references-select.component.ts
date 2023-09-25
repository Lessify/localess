import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormArray, FormBuilder, Validators } from '@angular/forms';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { SchemaFieldKind, SchemaFieldReferences } from '@shared/models/schema.model';
import { ContentDocument } from '@shared/models/content.model';
import { selectSettings } from '@core/state/settings/settings.selectors';
import { Store } from '@ngrx/store';
import { AppState } from '@core/state/core.state';

@Component({
  selector: 'll-references-select',
  templateUrl: './references-select.component.html',
  styleUrls: ['./references-select.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReferencesSelectComponent {
  @Input({ required: true }) form?: FormArray;
  @Input({ required: true }) component?: SchemaFieldReferences;
  @Input({ required: true }) documents: ContentDocument[] = [];

  // Subscriptions
  settings$ = this.store.select(selectSettings);

  constructor(
    private readonly fb: FormBuilder,
    readonly fe: FormErrorHandlerService,
    private readonly store: Store<AppState>
  ) {}

  addReference() {
    this.form?.push(
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
    this.form?.removeAt(idx);
  }
}
