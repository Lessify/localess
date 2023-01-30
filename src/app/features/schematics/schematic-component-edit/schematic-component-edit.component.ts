import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit} from '@angular/core';
import {FormArray, FormBuilder, FormGroup} from '@angular/forms';
import {SchematicValidator} from '@shared/validators/schematic.validator';
import {Schematic, SchematicComponentKind, SchematicComponentOptionSelectable} from '@shared/models/schematic.model';
import {MatSelectChange} from '@angular/material/select';
import {FormErrorHandlerService} from '@core/error-handler/form-error-handler.service';
import {environment} from '../../../../environments/environment';

interface ComponentKindDescription {
  name: string
  icon: string
}

@Component({
  selector: 'll-schematic-component-edit',
  templateUrl: './schematic-component-edit.component.html',
  styleUrls: ['./schematic-component-edit.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SchematicComponentEditComponent implements OnInit {

  @Input() form: FormGroup = this.fb.group({});
  @Input() reservedNames: string[] = [];
  @Input() schematics: Schematic[] = [];

  componentKinds = Object.keys(SchematicComponentKind)
  isTest = environment.test

  componentKindDescriptions: Record<string, ComponentKindDescription> = {
    'TEXT': {name: 'Text', icon: 'title'},
    'TEXTAREA': {name: 'TextArea', icon: 'rtt'},
    'NUMBER': {name: 'Number', icon: 'pin'},
    'COLOR': {name: 'Color', icon: 'colorize'},
    'DATE': {name: 'Date', icon: 'event'},
    'DATETIME': {name: 'Date and Time', icon: 'schedule'},
    'BOOLEAN': {name: 'Boolean', icon: 'toggle_on'},
    'OPTION': {name: 'Single Option', icon: 'list'},
    'OPTIONS': {name: 'Multiple Options', icon: 'list'},
    'SCHEMATIC': {name: 'Schematic (Beta)', icon: 'polyline'},
  }

  selectedComponentKind: ComponentKindDescription = this.componentKindDescriptions[SchematicComponentKind.TEXT];
  nameReadonly = true;

  constructor(
    readonly fe: FormErrorHandlerService,
    private readonly fb: FormBuilder,
    private readonly cd: ChangeDetectorRef,
  ) {
  }

  ngOnInit(): void {
    this.selectedComponentKind = this.componentKindDescriptions[this.form.value.kind]
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
      name: this.fb.control('', SchematicValidator.COMPONENT_OPTION_NAME),
      value: this.fb.control('', SchematicValidator.COMPONENT_OPTION_VALUE),
    })
  }

  selectComponentKind(event: MatSelectChange): void {
    const value: string = event.value;
    this.selectedComponentKind = this.componentKindDescriptions[value];
    switch (value) {
      case SchematicComponentKind.TEXT:
      case SchematicComponentKind.TEXTAREA: {
        // ADD
        this.form.addControl('translatable', this.fb.control<boolean | undefined>(undefined, SchematicValidator.COMPONENT_TRANSLATABLE))
        this.form.addControl('minLength', this.fb.control<number | undefined>(undefined, SchematicValidator.COMPONENT_MIN_LENGTH))
        this.form.addControl('maxLength', this.fb.control<number | undefined>(undefined, SchematicValidator.COMPONENT_MAX_LENGTH))
        // REMOVE
        // Number
        this.form.removeControl('minValue')
        this.form.removeControl('maxValue')
        // Option & Options
        this.form.removeControl('options')
        this.form.removeControl('minValues')
        this.form.removeControl('maxValues')
        // Schematic
        this.form.removeControl('schematics')
        break;
      }
      case SchematicComponentKind.NUMBER: {
        // ADD
        this.form.addControl('translatable', this.fb.control<boolean | undefined>(undefined, SchematicValidator.COMPONENT_TRANSLATABLE))
        this.form.addControl('minValue', this.fb.control<number | undefined>(undefined, SchematicValidator.COMPONENT_MIN_VALUE));
        this.form.addControl('maxValue', this.fb.control<number | undefined>(undefined, SchematicValidator.COMPONENT_MAX_VALUE));
        // REMOVE
        // Text & TextArea
        this.form.removeControl('minLength')
        this.form.removeControl('maxLength')
        // Option & Options
        this.form.removeControl('options')
        this.form.removeControl('minValues')
        this.form.removeControl('maxValues')
        // Schematic
        this.form.removeControl('schematics')
        break;
      }
      case SchematicComponentKind.COLOR: {
        // ADD
        this.form.addControl('translatable', this.fb.control<boolean | undefined>(undefined, SchematicValidator.COMPONENT_TRANSLATABLE))
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
        // Schematic
        this.form.removeControl('schematics')
        break;
      }

      case SchematicComponentKind.DATE: {
        // ADD
        this.form.addControl('translatable', this.fb.control<boolean | undefined>(undefined, SchematicValidator.COMPONENT_TRANSLATABLE))
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
        // Schematic
        this.form.removeControl('schematics')
        break;
      }
      case SchematicComponentKind.DATETIME: {
        // ADD
        this.form.addControl('translatable', this.fb.control<boolean | undefined>(undefined, SchematicValidator.COMPONENT_TRANSLATABLE))
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
        // Schematic
        this.form.removeControl('schematics')
        break;
      }
      case SchematicComponentKind.BOOLEAN: {
        // ADD
        this.form.addControl('translatable', this.fb.control<boolean | undefined>(undefined, SchematicValidator.COMPONENT_TRANSLATABLE))
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
        // Schematic
        this.form.removeControl('schematics')
        break;
      }
      case SchematicComponentKind.OPTION: {
        // ADD
        this.form.addControl('translatable', this.fb.control<boolean | undefined>(undefined, SchematicValidator.COMPONENT_TRANSLATABLE))
        const options: FormArray = this.fb.array<SchematicComponentOptionSelectable>([], SchematicValidator.COMPONENT_OPTIONS)
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
        // Schematic
        this.form.removeControl('schematics')
        break;
      }
      case SchematicComponentKind.OPTIONS: {
        // ADD
        this.form.addControl('translatable', this.fb.control<boolean | undefined>(undefined, SchematicValidator.COMPONENT_TRANSLATABLE))
        const options: FormArray = this.fb.array<SchematicComponentOptionSelectable>([], SchematicValidator.COMPONENT_OPTIONS)
        options.push(this.generateOptionForm())
        this.form.addControl('options', options)
        this.form.addControl('minValues', this.fb.control<number | undefined>(undefined, SchematicValidator.COMPONENT_MIN_VALUES));
        this.form.addControl('maxValues', this.fb.control<number | undefined>(undefined, SchematicValidator.COMPONENT_MAX_VALUES));
        // REMOVE
        // Text & TextArea
        this.form.removeControl('minLength')
        this.form.removeControl('maxLength')
        // Number
        this.form.removeControl('minValue')
        this.form.removeControl('maxValue')
        // Schematic
        this.form.removeControl('schematics')
        break;
      }
      case SchematicComponentKind.SCHEMATIC: {
        // ADD
        this.form.addControl('schematics', this.fb.control<string[] | undefined>(undefined));
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
