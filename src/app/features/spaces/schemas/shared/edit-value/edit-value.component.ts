import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, Input } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
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
  private readonly fb = inject(FormBuilder);
  private readonly cd = inject(ChangeDetectorRef);

  // Input
  @Input() form: FormGroup = this.fb.group({});

  settingsStore = inject(LocalSettingsStore);
}
