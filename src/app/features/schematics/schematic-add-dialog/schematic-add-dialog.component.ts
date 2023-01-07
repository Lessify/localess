import {ChangeDetectionStrategy, Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA} from '@angular/material/dialog';
import {FormBuilder, FormGroup} from '@angular/forms';
import {SchematicAddDialogModel} from './schematic-add-dialog.model';
import {SchematicValidator} from '@shared/validators/schematic.validator';
import {SchematicType} from '@shared/models/schematic.model';
import {FormErrorHandlerService} from '@core/error-handler/form-error-handler.service';
import {CommonValidator} from '@shared/validators/common.validator';

@Component({
  selector: 'll-schematic-add-dialog',
  templateUrl: './schematic-add-dialog.component.html',
  styleUrls: ['./schematic-add-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SchematicAddDialogComponent {

  types: string[] = Object.keys(SchematicType);

  form: FormGroup = this.fb.group({
    name: this.fb.control('', [...SchematicValidator.NAME, CommonValidator.reservedName(this.data.reservedNames)]),
    type: this.fb.control(SchematicType.ROOT, SchematicValidator.TYPE)
  });

  constructor(
    private readonly fb: FormBuilder,
    readonly fe: FormErrorHandlerService,
    @Inject(MAT_DIALOG_DATA) public data: SchematicAddDialogModel
  ) {
  }
}
