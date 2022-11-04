import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA} from '@angular/material/dialog';
import {FormArray, FormBuilder, FormGroup} from '@angular/forms';
import {SchematicEditDialogModel} from './schematic-edit-dialog.model';
import {SchemaValidator} from '@shared/validators/schema.validator';
import {SchematicComponent, SchematicComponentKind} from '@shared/models/schematic.model';
import {MatSelectChange} from '@angular/material/select';

interface ComponentKindDescription {
  name: string
  icon: string
}

type ComponentKindDescriptions = { [key: string]: ComponentKindDescription }

@Component({
  selector: 'll-schematic-edit-dialog',
  templateUrl: './schematic-edit-dialog.component.html',
  styleUrls: ['./schematic-edit-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SchematicEditDialogComponent implements OnInit {

  componentKinds = Object.keys(SchematicComponentKind)

  componentKindDescriptions: ComponentKindDescriptions = {
    'NUMBER': {name: 'Number', icon: 'pin'},
    'TEXT': {name: 'Text', icon: 'title'},
    'TEXTAREA': {name: 'TextArea', icon: 'rtt'},
    'DATE': {name: 'Date', icon: 'event'},
    'BOOLEAN': {name: 'Boolean', icon: 'toggle_on'}
  }

  selectedComponentKind ?: ComponentKindDescription;
  nameReadonly = true;
  componentNameReadonly = true;

  selectedComponentIdx ?: number;

  newComponentName = this.fb.control('', SchemaValidator.COMPONENT_NAME);

  form: FormGroup = this.fb.group({
    name: this.fb.control('', SchemaValidator.NAME),
    displayName: this.fb.control<string | undefined>(undefined, SchemaValidator.DISPLAY_NAME),
    components: this.fb.array<SchematicComponent>([])
  });

  constructor(
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

  get components(): FormArray {
    return this.form.controls['components'] as FormArray;
  }

  addComponent(element ?: SchematicComponent) {
    const defaultKind = SchematicComponentKind.TEXT;
    const form = this.fb.group({
      // Base
      name: this.fb.control(element?.name || this.newComponentName.value, SchemaValidator.COMPONENT_NAME),
      kind: this.fb.control(element?.kind || defaultKind, SchemaValidator.COMPONENT_KIND),
      displayName: this.fb.control<string | undefined>(element?.displayName, SchemaValidator.COMPONENT_DISPLAY_NAME),
      required: this.fb.control<boolean | undefined>(element?.required, SchemaValidator.COMPONENT_REQUIRED),
      description: this.fb.control<string | undefined>(element?.description, SchemaValidator.COMPONENT_DESCRIPTION),
      defaultValue: this.fb.control<string | undefined>(element?.defaultValue, SchemaValidator.COMPONENT_DEFAULT_VALUE),
      // Number
      minValue: this.fb.control<number | undefined>(undefined, SchemaValidator.COMPONENT_MIN_VALUE),
      maxValue: this.fb.control<number | undefined>(undefined, SchemaValidator.COMPONENT_MAX_VALUE),
      //Text and Textarea
      minLength: this.fb.control<number | undefined>(undefined, SchemaValidator.COMPONENT_MIN_LENGTH),
      maxLength: this.fb.control<number | undefined>(undefined, SchemaValidator.COMPONENT_MAX_LENGTH),
    })
    if (element?.kind === SchematicComponentKind.NUMBER) {
      form.controls['minValue'].setValue(element.minValue)
      form.controls['maxValue'].setValue(element.maxValue)
    }
    if (element?.kind === SchematicComponentKind.TEXT || element?.kind === SchematicComponentKind.TEXTAREA) {
      form.controls['minLength'].setValue(element.minLength)
      form.controls['maxLength'].setValue(element.maxLength)
    }

    this.selectedComponentKind = this.componentKindDescriptions[defaultKind];
    this.components.push(form);
    this.newComponentName.reset();
    this.selectComponent(this.components.length - 1)
  }

// handle form array element selection, by enforcing refresh
  selectComponent(index: number): void {
    this.selectedComponentIdx = undefined;
    this.cd.detectChanges();
    this.componentNameReadonly = true;
    this.selectedComponentIdx = index;
    this.selectedComponentKind = this.componentKindDescriptions[this.components.at(index).value.kind];
    this.cd.markForCheck();
  }

  selectComponentKind(event: MatSelectChange): void {
    const value: string = event.value;
    this.selectedComponentKind = this.componentKindDescriptions[value];
  }
}
