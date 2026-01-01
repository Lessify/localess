import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { provideIcons } from '@ng-icons/core';
import { lucideInfo } from '@ng-icons/lucide';
import { LocalSettingsStore } from '@shared/stores/local-settings.store';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';

@Component({
  selector: 'll-schema-value-edit',
  templateUrl: './edit-value.component.html',
  styleUrls: ['./edit-value.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatExpansionModule, CommonModule, HlmTooltipImports, HlmIconImports, HlmFieldImports, HlmInputImports],
  providers: [
    provideIcons({
      lucideInfo,
    }),
  ],
})
export class EditValueComponent {
  readonly fe = inject(FormErrorHandlerService);

  // Input
  form = input.required<FormGroup>();

  settingsStore = inject(LocalSettingsStore);
}
