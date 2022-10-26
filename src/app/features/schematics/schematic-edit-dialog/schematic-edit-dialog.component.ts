import {ChangeDetectionStrategy, Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA} from '@angular/material/dialog';
import {FormArray, FormBuilder, FormGroup, Validators} from '@angular/forms';
import {SchematicEditDialogModel} from './schematic-edit-dialog.model';
import {SchemaValidator} from '@shared/validators/schema.validator';
import {SchematicComponentKind, SchematicType} from '@shared/models/schematic.model';

@Component({
  selector: 'll-schematic-edit-dialog',
  templateUrl: './schematic-edit-dialog.component.html',
  styleUrls: ['./schematic-edit-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SchematicEditDialogComponent implements OnInit {

  componentKinds = Object.keys(SchematicComponentKind)

  form: FormGroup = this.fb.group({
    name: this.fb.control('', SchemaValidator.NAME),
    components: this.fb.array([])
  });

  constructor(
    private readonly fb: FormBuilder,
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
    this.components.push(this.fb.group({
      name: this.fb.control('', SchemaValidator.COMPONENT_NAME),
      kind: this.fb.control(SchematicComponentKind.TEXT, SchemaValidator.COMPONENT_NAME),
      displayName: this.fb.control(undefined, SchemaValidator.COMPONENT_DISPLAY_NAME),
      required: this.fb.control(undefined),
      description: this.fb.control(undefined, SchemaValidator.COMPONENT_DESCRIPTION),
    }));
  }
}
