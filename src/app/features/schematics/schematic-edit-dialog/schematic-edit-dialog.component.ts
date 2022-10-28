import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA} from '@angular/material/dialog';
import {FormArray, FormBuilder, FormGroup} from '@angular/forms';
import {SchematicEditDialogModel} from './schematic-edit-dialog.model';
import {SchemaValidator} from '@shared/validators/schema.validator';
import {SchematicComponentKind} from '@shared/models/schematic.model';

@Component({
  selector: 'll-schematic-edit-dialog',
  templateUrl: './schematic-edit-dialog.component.html',
  styleUrls: ['./schematic-edit-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SchematicEditDialogComponent implements OnInit {

  componentKinds = Object.keys(SchematicComponentKind)
  nameReadonly = true;
  componentNameReadonly = true;

  selectedComponentIdx?: number;

  newComponentName = this.fb.control('', SchemaValidator.COMPONENT_NAME);

  form: FormGroup = this.fb.group({
    name: this.fb.control('', SchemaValidator.NAME),
    displayName: this.fb.control<string | undefined>(undefined, SchemaValidator.DISPLAY_NAME),
    components: this.fb.array([])
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly cd: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) public data: SchematicEditDialogModel
  ) {
  }

  ngOnInit(): void {
    if (this.data != null) {
      this.form.patchValue(this.data.schematic);
    }
  }

  get components(): FormArray {
    return this.form.controls['components'] as FormArray;
  }

  addComponent() {
    const form = this.fb.group({
      // Base
      name: this.fb.control(this.newComponentName.value, SchemaValidator.COMPONENT_NAME),
      kind: this.fb.control(SchematicComponentKind.TEXT, SchemaValidator.COMPONENT_KIND),
      displayName: this.fb.control<string | undefined>(undefined, SchemaValidator.COMPONENT_DISPLAY_NAME),
      required: this.fb.control<boolean | undefined>(undefined),
      description: this.fb.control<string | undefined>(undefined, SchemaValidator.COMPONENT_DESCRIPTION),
      defaultValue: this.fb.control<string | undefined>(undefined, SchemaValidator.COMPONENT_DEFAULT_VALUE),
      // Number
      minValue: this.fb.control<number | undefined>(undefined, SchemaValidator.COMPONENT_MIN_VALUE),
      maxValue: this.fb.control<number| undefined>(undefined, SchemaValidator.COMPONENT_MAX_VALUE),
      //Text and Textarea
      minLength: this.fb.control<number | undefined>(undefined, SchemaValidator.COMPONENT_MIN_LENGTH),
      maxLength: this.fb.control<number| undefined>(undefined, SchemaValidator.COMPONENT_MAX_LENGTH),
    })
    this.components.push(form);
    this.newComponentName.reset();
    this.selectComponent(this.components.length - 1)
  }

  // handle form array element selection, by enforcing refresh
  selectComponent(index: number): void {
    this.selectedComponentIdx = undefined;
    this.componentNameReadonly = true;
    this.cd.detectChanges();
    this.selectedComponentIdx = index;
    this.cd.markForCheck();
  }
}
