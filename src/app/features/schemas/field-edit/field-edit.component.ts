import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit} from '@angular/core';
import {FormArray, FormBuilder, FormGroup} from '@angular/forms';
import {SchemasValidator} from '@shared/validators/schemas.validator';
import {
  Schema,
  SchemaFieldKind,
  schemaFieldKindDescriptions,
  SchemaFieldOptionSelectable
} from '@shared/models/schema.model';
import {MatSelectChange} from '@angular/material/select';
import {FormErrorHandlerService} from '@core/error-handler/form-error-handler.service';
import {environment} from '../../../../environments/environment';

@Component({
  selector: 'll-schema-field-edit',
  templateUrl: './field-edit.component.html',
  styleUrls: ['./field-edit.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FieldEditComponent implements OnInit {

  @Input() form: FormGroup = this.fb.group({});
  @Input() reservedNames: string[] = [];
  @Input() schemas: Schema[] = [];

  fieldKinds = Object.keys(SchemaFieldKind)
  isDebug = environment.debug

  schemaFieldKindDescriptions = schemaFieldKindDescriptions;
  selectedFieldKind = this.schemaFieldKindDescriptions[SchemaFieldKind.TEXT];
  nameReadonly = true;

  constructor(
    readonly fe: FormErrorHandlerService,
    private readonly fb: FormBuilder,
    private readonly cd: ChangeDetectorRef,
  ) {
  }

  ngOnInit(): void {
    this.selectedFieldKind = this.schemaFieldKindDescriptions[this.form.value.kind]
  }

  get options(): FormArray<FormGroup> | undefined {
    return this.form.controls['options'] as FormArray<FormGroup>;
  }

  addOptionForm(): void {
    this.options?.push(this.generateOptionForm())
  }

  removeOptionForm(idx: number): void {
    this.options?.removeAt(idx)
  }

  generateOptionForm(): FormGroup {
    return this.fb.group({
      name: this.fb.control('', SchemasValidator.FIELD_OPTION_NAME),
      value: this.fb.control('', SchemasValidator.FIELD_OPTION_VALUE),
    })
  }

  selectFieldKind(event: MatSelectChange): void {
    const value: string = event.value;
    this.selectedFieldKind = this.schemaFieldKindDescriptions[value];
    switch (value) {
      case SchemaFieldKind.TEXT:
      case SchemaFieldKind.TEXTAREA: {
        // ADD
        this.form.addControl('translatable', this.fb.control<boolean | undefined>(undefined, SchemasValidator.FIELD_TRANSLATABLE))
        this.form.addControl('minLength', this.fb.control<number | undefined>(undefined, SchemasValidator.FIELD_MIN_LENGTH))
        this.form.addControl('maxLength', this.fb.control<number | undefined>(undefined, SchemasValidator.FIELD_MAX_LENGTH))
        // REMOVE
        // Number
        this.form.removeControl('minValue')
        this.form.removeControl('maxValue')
        // Option & Options
        this.form.removeControl('options')
        this.form.removeControl('minValues')
        this.form.removeControl('maxValues')
        // Schema
        this.form.removeControl('schemas')
        break;
      }
      case SchemaFieldKind.NUMBER: {
        // ADD
        this.form.addControl('translatable', this.fb.control<boolean | undefined>(undefined, SchemasValidator.FIELD_TRANSLATABLE))
        this.form.addControl('minValue', this.fb.control<number | undefined>(undefined, SchemasValidator.FIELD_MIN_VALUE));
        this.form.addControl('maxValue', this.fb.control<number | undefined>(undefined, SchemasValidator.FIELD_MAX_VALUE));
        // REMOVE
        // Text & TextArea
        this.form.removeControl('minLength')
        this.form.removeControl('maxLength')
        // Option & Options
        this.form.removeControl('options')
        this.form.removeControl('minValues')
        this.form.removeControl('maxValues')
        // Schema
        this.form.removeControl('schemas')
        break;
      }
      case SchemaFieldKind.COLOR: {
        // ADD
        this.form.addControl('translatable', this.fb.control<boolean | undefined>(undefined, SchemasValidator.FIELD_TRANSLATABLE))
        // REMOVE
        // Text & TextArea
        this.form.removeControl('minLength')
        this.form.removeControl('maxLength')
        // Number
        this.form.removeControl('minValue')
        this.form.removeControl('maxValue')
        // Option & Options
        this.form.removeControl('options')
        this.form.removeControl('minValues')
        this.form.removeControl('maxValues')
        // Schema
        this.form.removeControl('schemas')
        break;
      }

      case SchemaFieldKind.DATE: {
        // ADD
        this.form.addControl('translatable', this.fb.control<boolean | undefined>(undefined, SchemasValidator.FIELD_TRANSLATABLE))
        // REMOVE
        // Text & TextArea
        this.form.removeControl('minLength')
        this.form.removeControl('maxLength')
        // Number
        this.form.removeControl('minValue')
        this.form.removeControl('maxValue')
        // Option & Options
        this.form.removeControl('options')
        this.form.removeControl('minValues')
        this.form.removeControl('maxValues')
        // Schema
        this.form.removeControl('schemas')
        break;
      }
      case SchemaFieldKind.DATETIME: {
        // ADD
        this.form.addControl('translatable', this.fb.control<boolean | undefined>(undefined, SchemasValidator.FIELD_TRANSLATABLE))
        // REMOVE
        // Text & TextArea
        this.form.removeControl('minLength')
        this.form.removeControl('maxLength')
        // Number
        this.form.removeControl('minValue')
        this.form.removeControl('maxValue')
        // Option & Options
        this.form.removeControl('options')
        this.form.removeControl('minValues')
        this.form.removeControl('maxValues')
        // Schema
        this.form.removeControl('schemas')
        break;
      }
      case SchemaFieldKind.BOOLEAN: {
        // ADD
        this.form.addControl('translatable', this.fb.control<boolean | undefined>(undefined, SchemasValidator.FIELD_TRANSLATABLE))
        // REMOVE
        // Text & TextArea
        this.form.removeControl('minLength')
        this.form.removeControl('maxLength')
        // Number
        this.form.removeControl('minValue')
        this.form.removeControl('maxValue')
        // Option & Options
        this.form.removeControl('options')
        this.form.removeControl('minValues')
        this.form.removeControl('maxValues')
        // Schema
        this.form.removeControl('schemas')
        break;
      }
      case SchemaFieldKind.OPTION: {
        // ADD
        this.form.addControl('translatable', this.fb.control<boolean | undefined>(undefined, SchemasValidator.FIELD_TRANSLATABLE))
        const options: FormArray = this.fb.array<SchemaFieldOptionSelectable>([], SchemasValidator.FIELD_OPTIONS)
        options.push(this.generateOptionForm())
        this.form.addControl('options', options)
        // REMOVE
        // Text & TextArea
        this.form.removeControl('minLength')
        this.form.removeControl('maxLength')
        // Number
        this.form.removeControl('minValue')
        this.form.removeControl('maxValue')
        // Options
        this.form.removeControl('minValues')
        this.form.removeControl('maxValues')
        // Schema
        this.form.removeControl('schemas')
        break;
      }
      case SchemaFieldKind.OPTIONS: {
        // ADD
        this.form.addControl('translatable', this.fb.control<boolean | undefined>(undefined, SchemasValidator.FIELD_TRANSLATABLE))
        const options: FormArray = this.fb.array<SchemaFieldOptionSelectable>([], SchemasValidator.FIELD_OPTIONS)
        options.push(this.generateOptionForm())
        this.form.addControl('options', options)
        this.form.addControl('minValues', this.fb.control<number | undefined>(undefined, SchemasValidator.FIELD_MIN_VALUES));
        this.form.addControl('maxValues', this.fb.control<number | undefined>(undefined, SchemasValidator.FIELD_MAX_VALUES));
        // REMOVE
        // Text & TextArea
        this.form.removeControl('minLength')
        this.form.removeControl('maxLength')
        // Number
        this.form.removeControl('minValue')
        this.form.removeControl('maxValue')
        // Schema
        this.form.removeControl('schemas')
        break;
      }
      case SchemaFieldKind.LINK: {
        // ADD
        this.form.addControl('translatable', this.fb.control<boolean | undefined>(undefined, SchemasValidator.FIELD_TRANSLATABLE))
        // REMOVE
        // Text & TextArea
        this.form.removeControl('minLength')
        this.form.removeControl('maxLength')
        // Number
        this.form.removeControl('minValue')
        this.form.removeControl('maxValue')
        // Option & Options
        this.form.removeControl('options')
        this.form.removeControl('minValues')
        this.form.removeControl('maxValues')
        // Schema
        this.form.removeControl('schemas')
        break;
      }
      case SchemaFieldKind.ASSET: {
        // ADD
        this.form.addControl('translatable', this.fb.control<boolean | undefined>(undefined, SchemasValidator.FIELD_TRANSLATABLE))
        // REMOVE
        // Text & TextArea
        this.form.removeControl('minLength')
        this.form.removeControl('maxLength')
        // Number
        this.form.removeControl('minValue')
        this.form.removeControl('maxValue')
        // Option & Options
        this.form.removeControl('options')
        this.form.removeControl('minValues')
        this.form.removeControl('maxValues')
        // Schema
        this.form.removeControl('schemas')
        break;
      }
      case SchemaFieldKind.ASSETS: {
        // ADD
        this.form.addControl('translatable', this.fb.control<boolean | undefined>(undefined, SchemasValidator.FIELD_TRANSLATABLE))
        // REMOVE
        // Text & TextArea
        this.form.removeControl('minLength')
        this.form.removeControl('maxLength')
        // Number
        this.form.removeControl('minValue')
        this.form.removeControl('maxValue')
        // Option & Options
        this.form.removeControl('options')
        this.form.removeControl('minValues')
        this.form.removeControl('maxValues')
        // Schema
        this.form.removeControl('schemas')
        break;
      }
      case SchemaFieldKind.SCHEMA: {
        // ADD
        this.form.addControl('schemas', this.fb.control<string[] | undefined>(undefined));
        // REMOVE
        this.form.removeControl('translatable')
        // Text & TextArea
        this.form.removeControl('minLength')
        this.form.removeControl('maxLength')
        // Number
        this.form.removeControl('minValue')
        this.form.removeControl('maxValue')
        // Option & Options
        this.form.removeControl('options')
        this.form.removeControl('minValues')
        this.form.removeControl('maxValues')
        break;
      }
    }
  }


}
