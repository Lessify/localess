import {ChangeDetectionStrategy, Component, Inject} from '@angular/core';
import {MAT_DIALOG_DATA} from '@angular/material/dialog';
import {FormBuilder, FormRecord, ValidatorFn, Validators} from '@angular/forms';
import {ConfigDialogModel} from './config-dialog.model';
import {FormErrorHandlerService} from '@core/error-handler/form-error-handler.service';

@Component({
  selector: 'll-plugin-config-dialog',
  templateUrl: './config-dialog.component.html',
  styleUrls: ['./config-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConfigDialogComponent {

  form: FormRecord = this.fb.record({});

  constructor(
    private readonly fb: FormBuilder,
    readonly fe: FormErrorHandlerService,
    @Inject(MAT_DIALOG_DATA) public data: ConfigDialogModel
  ) {
    this.generateForm()
  }

  generateForm(): void {
    for (const config of this.data.plugin.configurationFields || []) {
      const validators: ValidatorFn[] = []
      if (config.required) {
        validators.push(Validators.required)
      }
      this.form.setControl(config.name, this.fb.control<string | undefined>(undefined, validators))
    }
  }
}
