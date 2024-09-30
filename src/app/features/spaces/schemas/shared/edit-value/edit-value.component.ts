import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, Input } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { LocalSettingsStore } from '@shared/stores/local-settings.store';

@Component({
  selector: 'll-schema-value-edit',
  templateUrl: './edit-value.component.html',
  styleUrls: ['./edit-value.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditValueComponent {
  // Input
  @Input() form: FormGroup = this.fb.group({});

  settingsStore = inject(LocalSettingsStore);

  constructor(
    readonly fe: FormErrorHandlerService,
    private readonly fb: FormBuilder,
    private readonly cd: ChangeDetectorRef,
  ) {}
}
