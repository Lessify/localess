import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { NameUtils } from '@core/utils/name-utils.service';
import { provideIcons } from '@ng-icons/core';
import { lucideFileBox, lucideList, lucideWandSparkles, lucideWorkflow } from '@ng-icons/lucide';
import { SchemaCreate, SchemaType, schemaTypeDescriptions } from '@shared/models/schema.model';
import { CommonValidator } from '@shared/validators/common.validator';
import { SchemaValidator } from '@shared/validators/schema.validator';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';

import { AddDialogContext } from './add-dialog.model';

@Component({
  selector: 'll-schema-add-dialog',
  templateUrl: './add-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'grid gap-4' },
  imports: [
    HlmDialogImports,
    ReactiveFormsModule,
    HlmButtonImports,
    HlmFieldImports,
    HlmIconImports,
    HlmInputImports,
    HlmInputGroupImports,
    HlmSelectImports,
    HlmTooltipImports,
  ],
  providers: [
    provideIcons({
      lucideList,
      lucideFileBox,
      lucideWorkflow,
      lucideWandSparkles,
    }),
  ],
})
export class AddDialogComponent {
  private readonly fb = inject(FormBuilder);
  readonly fe = inject(FormErrorHandlerService);
  private readonly dialogRef = inject<BrnDialogRef<SchemaCreate>>(BrnDialogRef);

  /** Required: the caller always passes the ids already taken, which the id validator needs. */
  private readonly context = injectBrnDialogContext<AddDialogContext>();

  schemaTypeDescriptions = schemaTypeDescriptions;
  types: string[] = Object.keys(SchemaType);

  form: FormGroup = this.fb.group({
    displayName: this.fb.control<string | undefined>(undefined, SchemaValidator.DISPLAY_NAME),
    id: this.fb.control<string | undefined>('', [...SchemaValidator.ID, CommonValidator.reservedName(this.context.reservedIds)]),
    type: this.fb.control<SchemaType>(SchemaType.NODE, SchemaValidator.TYPE),
  });

  formDisplayNameValue = toSignal(this.form.controls['displayName'].valueChanges);

  constructor() {
    effect(() => {
      if (!this.form.controls['id'].touched) {
        this.form.controls['id'].setValue(NameUtils.schemaId(this.formDisplayNameValue() || ''));
      }
    });
  }

  get type(): SchemaType {
    return this.form.controls['type'].value;
  }

  protected readonly typeItemToString = (value: string): string => {
    return schemaTypeDescriptions[value as SchemaType]?.name ?? value;
  };

  normalizeId(): void {
    if (this.form.value.id) {
      this.form.controls['id'].setValue(NameUtils.schemaId(this.form.value.id));
    }
  }

  save(): void {
    this.dialogRef.close(this.form.value as SchemaCreate);
  }
}
