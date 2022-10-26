import {ChangeDetectionStrategy, Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA} from '@angular/material/dialog';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {SchematicEditDialogModel} from './schematic-edit-dialog.model';
import {SchemaValidator} from '@shared/validators/schema.validator';
import {SchematicType} from '@shared/models/schematic.model';

@Component({
  selector: 'll-schematic-edit-dialog',
  templateUrl: './schematic-edit-dialog.component.html',
  styleUrls: ['./schematic-edit-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SchematicEditDialogComponent implements OnInit {


  form: FormGroup = this.fb.group({
    name: this.fb.control('', SchemaValidator.NAME),
    type: this.fb.control(SchematicType.ROOT, Validators.required)
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
}
