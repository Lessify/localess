import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { AbstractControl, ReactiveFormsModule } from '@angular/forms';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { provideIcons } from '@ng-icons/core';
import { lucideEye, lucideEyeOff, lucideInfo, lucideLanguages } from '@ng-icons/lucide';
import { ContentData } from '@shared/models/content.model';
import { CONTENT_DEFAULT_LOCALE, Locale } from '@shared/models/locale.model';
import { SchemaFieldMarkdown } from '@shared/models/schema.model';
import { CanUserPerformPipe } from '@shared/pipes/can-user-perform.pipe';
import { NotificationService } from '@shared/services/notification.service';
import { TranslateService } from '@shared/services/translate.service';
import { LocalSettingsStore } from '@shared/stores/local-settings.store';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
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
    HlmDropdownMenuImports,
    CanUserPerformPipe,
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
  private readonly translateService = inject(TranslateService);
  private readonly notificationService = inject(NotificationService);

  // Input
  data = input.required<ContentData>();
  form = input.required<AbstractControl>();
  component = input.required<SchemaFieldMarkdown>();
  default = input<string>();
  selectedLocale = input.required<Locale>();
  availableLocales = input.required<Locale[]>();

  isDefaultLocale = computed(() => this.selectedLocale().id === CONTENT_DEFAULT_LOCALE.id);
  selectedLocaleId = computed(() => this.selectedLocale().id);

  preview = signal(false);

  //Settings
  settingsStore = inject(LocalSettingsStore);
  lowlight = createLowlight(common);

  translate(fieldName: string, sourceLocale: string, targetLocale: string): void {
    // get source locale content
    // this.data[`${field.name}_i18n_${this.selectedLocaleId()}`];
    //debugger;
    let content = '';
    if (sourceLocale === CONTENT_DEFAULT_LOCALE.id) {
      content = this.data()[fieldName];
    } else {
      content = this.data()[`${fieldName}_i18n_${sourceLocale}`];
    }
    if (content === undefined || content === null || content === '') {
      this.notificationService.error('No content to translate');
    } else {
      this.translateService
        .translate({
          content: content,
          sourceLocale: sourceLocale !== CONTENT_DEFAULT_LOCALE.id ? sourceLocale : null,
          targetLocale: targetLocale,
        })
        .subscribe({
          next: result => {
            this.form().setValue(result);
            this.notificationService.success('Translated');
          },
          error: err => {
            console.error(err);
            this.notificationService.error('Can not be translation.', {
              action: {
                type: 'link',
                label: 'Documentation',
                link: 'https://localess.org/docs/setup/firebase#errors-in-the-user-interface',
              },
            });
          },
        });
    }
  }
}
