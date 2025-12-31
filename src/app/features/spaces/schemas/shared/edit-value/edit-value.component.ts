import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { LocalSettingsStore } from '@shared/stores/local-settings.store';

@Component({
  selector: 'll-schema-value-edit',
  templateUrl: './edit-value.component.html',
  styleUrls: ['./edit-value.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatFormFieldModule, ReactiveFormsModule, MatInputModule, MatExpansionModule, CommonModule],
})
export class EditValueComponent {
  readonly fe = inject(FormErrorHandlerService);

  // Input
  form = input.required<FormGroup>();

  settingsStore = inject(LocalSettingsStore);
}
