import {ChangeDetectionStrategy, Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA} from '@angular/material/dialog';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {SchematicAddDialogModel} from './schematic-add-dialog.model';
import {SchemaValidator} from '@shared/validators/schema.validator';
import {SchematicType} from '@shared/models/schematic.model';
import {FormErrorHandlerService} from '../../../core/error-handler/form-error-handler.service';

@Component({
  selector: 'll-schematic-add-dialog',
  templateUrl: './schematic-add-dialog.component.html',
  styleUrls: ['./schematic-add-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SchematicAddDialogComponent implements OnInit {

  types: string[] = Object.keys(SchematicType);

  form: FormGroup = this.fb.group({
    name: this.fb.control('', SchemaValidator.NAME),
    type: this.fb.control(SchematicType.ROOT, SchemaValidator.TYPE)
  });

  constructor(
    private readonly fb: FormBuilder,
    readonly fe: FormErrorHandlerService,
    @Inject(MAT_DIALOG_DATA) public data: SchematicAddDialogModel
  ) {
  }

  ngOnInit(): void {
    if (this.data != null) {
      this.form.patchValue(this.data);
    }
  }
}
