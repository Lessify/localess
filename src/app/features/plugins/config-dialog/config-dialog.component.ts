import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { FormBuilder, FormRecord, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { PluginConfiguration } from '@shared/models/plugin.model';
import { ConfigDialogModel } from './config-dialog.model';

@Component({
  selector: 'll-plugin-config-dialog',
  standalone: true,
  templateUrl: './config-dialog.component.html',
  styleUrls: ['./config-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, ReactiveFormsModule, MatFormFieldModule, MatSelectModule, MatInputModule, MatButtonModule],
})
export class ConfigDialogComponent {
  form: FormRecord = this.fb.record({});

  constructor(
    private readonly fb: FormBuilder,
    readonly fe: FormErrorHandlerService,
    @Inject(MAT_DIALOG_DATA) public data: ConfigDialogModel,
  ) {
    this.generateForm(data.plugin.configuration);
  }

  generateForm(configuration?: PluginConfiguration): void {
    for (const config of this.data.plugin.configurationFields || []) {
      const validators: ValidatorFn[] = [];
      if (config.required) {
        validators.push(Validators.required);
      }
      let value = config.defaultValue;
      if (configuration && configuration[config.name] !== undefined) {
        value = configuration[config.name];
      }
      this.form.setControl(config.name, this.fb.control<string | undefined>(value, validators));
    }
  }
}
