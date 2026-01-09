import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { AbstractControl, ReactiveFormsModule } from '@angular/forms';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { provideIcons } from '@ng-icons/core';
import { lucideEye, lucideEyeOff, lucideInfo, lucideLanguages } from '@ng-icons/lucide';
import { SchemaFieldMarkdown } from '@shared/models/schema.model';
import { LocalSettingsStore } from '@shared/stores/local-settings.store';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmSeparatorImports } from '@spartan-ng/helm/separator';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { common, createLowlight } from 'lowlight';
import { MarkdownComponent } from 'ngx-markdown';

@Component({
  selector: 'll-markdown-editor',
  templateUrl: './markdown-editor.component.html',
  styleUrls: ['./markdown-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    HlmFieldImports,
    HlmTooltipImports,
    HlmIconImports,
    HlmInputGroupImports,
    HlmSeparatorImports,
    MarkdownComponent,
  ],
  providers: [
    provideIcons({
      lucideLanguages,
      lucideInfo,
      lucideEye,
      lucideEyeOff,
    }),
  ],
})
export class MarkdownEditorComponent {
  readonly fe = inject(FormErrorHandlerService);

  // Input
  form = input.required<AbstractControl>();
  component = input.required<SchemaFieldMarkdown>();
  default = input<string>();

  preview = signal(false);

  //Settings
  settingsStore = inject(LocalSettingsStore);
  lowlight = createLowlight(common);
}
