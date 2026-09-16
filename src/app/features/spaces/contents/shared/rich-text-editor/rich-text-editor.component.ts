import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, OnDestroy } from '@angular/core';
import { AbstractControl, ReactiveFormsModule } from '@angular/forms';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { provideIcons } from '@ng-icons/core';
import { lucideInfo, lucideLanguages } from '@ng-icons/lucide';
import { ContentData } from '@shared/models/content.model';
import { CONTENT_DEFAULT_LOCALE, Locale } from '@shared/models/locale.model';
import { SchemaFieldRichText } from '@shared/models/schema.model';
import { NotificationService } from '@shared/services/notification.service';
import { TranslateService } from '@shared/services/translate.service';
import { LocalSettingsStore } from '@shared/stores/local-settings.store';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmSeparatorImports } from '@spartan-ng/helm/separator';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { Editor, generateHTML, JSONContent } from '@tiptap/core';
import { TiptapEditorDirective } from 'ngx-tiptap';

import { EditorToolbarComponent } from '../editor-toolbar/editor-toolbar.component';
import { TranslateMenuComponent } from '../translate-menu/translate-menu.component';
import { createRichTextExtensions } from './rich-text-extensions';

@Component({
  selector: 'll-rich-text-editor',
  templateUrl: './rich-text-editor.component.html',
  styleUrls: ['./rich-text-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    TiptapEditorDirective,
    ReactiveFormsModule,
    HlmFieldImports,
    HlmTooltipImports,
    HlmIconImports,
    HlmInputGroupImports,
    HlmSeparatorImports,
    EditorToolbarComponent,
    TranslateMenuComponent,
  ],
  providers: [
    provideIcons({
      lucideLanguages,
      lucideInfo,
    }),
  ],
})
export class RichTextEditorComponent implements OnDestroy {
  readonly fe = inject(FormErrorHandlerService);
  private readonly translateService = inject(TranslateService);
  private readonly notificationService = inject(NotificationService);

  // Input
  data = input.required<ContentData>();
  form = input.required<AbstractControl>();
  component = input.required<SchemaFieldRichText>();
  selectedLocale = input.required<Locale>();
  availableLocales = input.required<Locale[]>();

  isDefaultLocale = computed(() => this.selectedLocale().id === CONTENT_DEFAULT_LOCALE.id);
  selectedLocaleId = computed(() => this.selectedLocale().id);

  //Settings
  settingsStore = inject(LocalSettingsStore);

  editor = new Editor({
    extensions: createRichTextExtensions(),
    editorProps: {
      attributes: {
        class: 'p-2 border-color rounded-b-md outline-hidden',
        spellcheck: 'false',
      },
    },
  });

  /**
   * Translates the field from `sourceLocale` into the selected locale.
   *
   * A RICH_TEXT field stores a TipTap document rather than text, so the document is handed to the
   * provider as HTML: in that mode both DeepL and Google Translate pass markup through untouched
   * and translate only text nodes, which keeps the structure and the marks intact. The translated
   * HTML is then parsed back by the editor, whose value accessor writes the JSON to the form.
   */
  translate(fieldName: string, sourceLocale: string, targetLocale: string): void {
    const source: JSONContent | string | undefined =
      sourceLocale === CONTENT_DEFAULT_LOCALE.id ? this.data()[fieldName] : this.data()[`${fieldName}_i18n_${sourceLocale}`];

    const content = this.toHtml(source);
    if (!content) {
      this.notificationService.error('No content to translate');
      return;
    }

    this.translateService
      .translate({
        content,
        sourceLocale: sourceLocale !== CONTENT_DEFAULT_LOCALE.id ? sourceLocale : null,
        targetLocale,
        format: 'html',
      })
      .subscribe({
        next: result => {
          // Emits an update, so ngx-tiptap's value accessor writes the new JSON to the control.
          this.editor.commands.setContent(result);
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

  /**
   * Renders a stored field value as HTML, or `undefined` when there is nothing to translate.
   *
   * The value is normally a TipTap document, but a field that has never been edited can hold a
   * plain string, and `generateHTML` throws on anything that is not a document.
   */
  private toHtml(value: JSONContent | string | undefined): string | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value === 'string') return value;
    try {
      const html = generateHTML(value, createRichTextExtensions());
      // An empty document renders as a single empty paragraph, which is not worth a provider call.
      return html === '<p></p>' ? undefined : html;
    } catch (err) {
      console.error(err);
      return undefined;
    }
  }

  ngOnDestroy(): void {
    this.editor.destroy();
  }
}
