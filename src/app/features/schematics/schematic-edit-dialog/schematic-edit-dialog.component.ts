import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA} from '@angular/material/dialog';
import {AbstractControl, FormArray, FormBuilder, FormGroup, FormRecord} from '@angular/forms';
import {SchematicEditDialogModel} from './schematic-edit-dialog.model';
import {SchematicValidator} from '@shared/validators/schematic.validator';
import {
  SchematicComponent,
  SchematicComponentKind,
  SchematicComponentOptionSelectable
} from '@shared/models/schematic.model';
import {MatSelectChange} from '@angular/material/select';
import {FormErrorHandlerService} from '@core/error-handler/form-error-handler.service';
import {environment} from '../../../../environments/environment';
import {CommonValidator} from '@shared/validators/common.validator';

interface ComponentKindDescription {
  name: string
  icon: string
}

@Component({
  selector: 'll-schematic-edit-dialog',
  templateUrl: './schematic-edit-dialog.component.html',
  styleUrls: ['./schematic-edit-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SchematicEditDialogComponent implements OnInit {

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

  selectedComponentKind ?: ComponentKindDescription;
  nameReadonly = true;
  componentNameReadonly = true;

  selectedComponentIdx ?: number;

  componentReservedNames: string[] = [];
  newComponentName = this.fb.control('', [...SchematicValidator.COMPONENT_NAME, CommonValidator.reservedName(this.componentReservedNames)]);


  form: FormRecord = this.fb.record({
    name: this.fb.control('', [...SchematicValidator.NAME, CommonValidator.reservedName(this.data.reservedNames, this.data.schematic.name)]),
    displayName: this.fb.control<string | undefined>(undefined, SchematicValidator.DISPLAY_NAME),
    components: this.fb.array<SchematicComponent>([])
  });

  constructor(
    readonly fe: FormErrorHandlerService,
    private readonly fb: FormBuilder,
    private readonly cd: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA)
    public data: SchematicEditDialogModel
  ) {
  }

  ngOnInit(): void {
    if (this.data != null) {
      this.form.patchValue(this.data.schematic);
      this.data.schematic.components?.forEach(it => this.addComponent(it))
    }
  }

  get components(): FormArray<FormGroup> {
    return this.form.controls['components'] as FormArray<FormGroup>;
  }

  componentControlAt(index: number, controlName: string): AbstractControl | undefined {
    return this.components.at(index)?.controls[controlName]
  }

  componentAt(index: number): FormGroup | undefined {
    return this.components.at(index)
  }

  generateOptionForm(option?: SchematicComponentOptionSelectable): FormGroup {
    return this.fb.group({
      name: this.fb.control(option?.name, SchematicValidator.COMPONENT_OPTION_NAME),
      value: this.fb.control(option?.value, SchematicValidator.COMPONENT_OPTION_VALUE),
    })
  }

  addComponent(element?: SchematicComponent) {
    const componentName = element?.name || this.newComponentName.value || '';
    this.componentReservedNames.push(componentName)

    const defaultKind = SchematicComponentKind.TEXT;
    const componentForm = this.fb.group<{}>({
      // Base
      name: this.fb.control(componentName, [...SchematicValidator.COMPONENT_NAME, CommonValidator.reservedName(this.componentReservedNames, componentName)]),
      kind: this.fb.control(element?.kind || defaultKind, SchematicValidator.COMPONENT_KIND),
      displayName: this.fb.control<string | undefined>(element?.displayName, SchematicValidator.COMPONENT_DISPLAY_NAME),
      required: this.fb.control<boolean | undefined>(element?.required, SchematicValidator.COMPONENT_REQUIRED),
      description: this.fb.control<string | undefined>(element?.description, SchematicValidator.COMPONENT_DESCRIPTION),
      defaultValue: this.fb.control<string | undefined>(element?.defaultValue, SchematicValidator.COMPONENT_DEFAULT_VALUE),
    })

    switch (element?.kind) {
      case SchematicComponentKind.TEXT:
      case SchematicComponentKind.TEXTAREA: {
        componentForm.addControl('translatable', this.fb.control<boolean | undefined>(element.translatable, SchematicValidator.COMPONENT_TRANSLATABLE))
        componentForm.addControl('minLength', this.fb.control<number | undefined>(element.minLength, SchematicValidator.COMPONENT_MIN_LENGTH))
        componentForm.addControl('maxLength', this.fb.control<number | undefined>(element.maxLength, SchematicValidator.COMPONENT_MAX_LENGTH))
        break;
      }
      case SchematicComponentKind.NUMBER: {
        componentForm.addControl('translatable', this.fb.control<boolean | undefined>(element.translatable, SchematicValidator.COMPONENT_TRANSLATABLE))
        componentForm.addControl('minValue', this.fb.control<number | undefined>(element.minValue, SchematicValidator.COMPONENT_MIN_VALUE));
        componentForm.addControl('maxValue', this.fb.control<number | undefined>(element.maxValue, SchematicValidator.COMPONENT_MAX_VALUE));
        break;
      }
      case SchematicComponentKind.COLOR: {
        componentForm.addControl('translatable', this.fb.control<boolean | undefined>(element.translatable, SchematicValidator.COMPONENT_TRANSLATABLE))
        break;
      }
      case SchematicComponentKind.DATE: {
        componentForm.addControl('translatable', this.fb.control<boolean | undefined>(element.translatable, SchematicValidator.COMPONENT_TRANSLATABLE))
        break;
      }
      case SchematicComponentKind.BOOLEAN: {
        componentForm.addControl('translatable', this.fb.control<boolean | undefined>(element.translatable, SchematicValidator.COMPONENT_TRANSLATABLE))
        break;
      }
      case SchematicComponentKind.OPTION: {
        componentForm.addControl('translatable', this.fb.control<boolean | undefined>(element.translatable, SchematicValidator.COMPONENT_TRANSLATABLE))
        const options: FormArray = this.fb.array<SchematicComponentOptionSelectable>([]);
        element.options.forEach(it => options.push(this.generateOptionForm(it)))
        componentForm.addControl('options', options)

        break;
      }
      case SchematicComponentKind.OPTIONS: {
        componentForm.addControl('translatable', this.fb.control<boolean | undefined>(element.translatable, SchematicValidator.COMPONENT_TRANSLATABLE))
        const options: FormArray = this.fb.array<SchematicComponentOptionSelectable>([]);
        element.options.forEach(it => options.push(this.generateOptionForm(it)))
        componentForm.addControl('options', options)
        componentForm.addControl('minValues', this.fb.control<number | undefined>(element.minValues, SchematicValidator.COMPONENT_MIN_VALUES));
        componentForm.addControl('maxValues', this.fb.control<number | undefined>(element.maxValues, SchematicValidator.COMPONENT_MAX_VALUES));
        break;
      }
      case SchematicComponentKind.SCHEMATIC: {
        componentForm.addControl('schematics', this.fb.control<string[] | undefined>(element.schematics, SchematicValidator.COMPONENT_SCHEMATIC));
        break;
      }
      // By default, it is a new TEXT
      default: {
        componentForm.addControl('translatable', this.fb.control<boolean | undefined>(undefined, SchematicValidator.COMPONENT_TRANSLATABLE))
        componentForm.addControl('minLength', this.fb.control<number | undefined>(undefined, SchematicValidator.COMPONENT_MIN_LENGTH))
        componentForm.addControl('maxLength', this.fb.control<number | undefined>(undefined, SchematicValidator.COMPONENT_MAX_LENGTH))
      }
    }
    this.selectedComponentKind = this.componentKindDescriptions[defaultKind];
    this.components.push(componentForm);
    this.newComponentName.reset();
    this.selectComponent(this.components.length - 1);
  }

  removeComponent(event: Event, index: number): void {
    // Prevent Default
    event.preventDefault();
    event.stopImmediatePropagation();
    // Remove name from reserved names
    const cValue = this.componentControlAt(index, 'name')?.value
    if (cValue) {
      const idx = this.componentReservedNames.indexOf(cValue);
      if (idx !== -1) {
        this.componentReservedNames.splice(index, 1);
      }
    }
    // Remove
    this.components.removeAt(index);
    if (this.components.length === 0) {
      this.selectedComponentIdx = undefined;
      this.cd.markForCheck();
    } else if (this.selectedComponentIdx) {
      if (index == 0 && this.selectedComponentIdx == 0) {
        this.selectComponent(0);
      } else if (index <= this.selectedComponentIdx) {
        this.selectComponent(this.selectedComponentIdx - 1);
      }
    }
  }

  // handle form array element selection, by enforcing refresh
  selectComponent(index: number): void {
    this.selectedComponentIdx = undefined;
    this.cd.detectChanges();
    this.componentNameReadonly = true;
    this.selectedComponentIdx = index;
    this.selectedComponentKind = this.componentKindDescriptions[this.components.at(index).value['kind']];
    this.cd.markForCheck();
  }
}
