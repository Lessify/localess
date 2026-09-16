import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, OnDestroy, signal, untracked } from '@angular/core';
import { AbstractControl, ReactiveFormsModule } from '@angular/forms';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { provideIcons } from '@ng-icons/core';
import { lucideEye, lucideFileCode, lucideInfo, lucideLanguages } from '@ng-icons/lucide';
import { ContentData } from '@shared/models/content.model';
import { CONTENT_DEFAULT_LOCALE, Locale } from '@shared/models/locale.model';
import { SchemaFieldMarkdown } from '@shared/models/schema.model';
import { NotificationService } from '@shared/services/notification.service';
import { TranslateService } from '@shared/services/translate.service';
import { LocalSettingsStore, MarkdownMode } from '@shared/stores/local-settings.store';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmSeparatorImports } from '@spartan-ng/helm/separator';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { Editor } from '@tiptap/core';
import { TiptapEditorDirective } from 'ngx-tiptap';

import { EditorToolbarComponent } from '../editor-toolbar/editor-toolbar.component';
import { TranslateMenuComponent } from '../translate-menu/translate-menu.component';
import { createMarkdownExtensions, hasUnsupportedMarkdown } from './markdown-extensions';

@Component({
  selector: 'll-markdown-editor',
  templateUrl: './markdown-editor.component.html',
  styleUrls: ['./markdown-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TiptapEditorDirective,
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
      lucideEye,
      lucideFileCode,
    }),
  ],
})
export class MarkdownEditorComponent implements OnDestroy {
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

  private readonly settingsStore = inject(LocalSettingsStore);

  /**
   * The effective mode for this field.
   *
   * Authors settle into one way of working - hand-written markdown or the visual editor - so the
   * choice is a remembered user preference rather than per-field state, and it survives a reload.
   * A field whose content WYSIWYG mode cannot represent is shown as source regardless, which is
   * what keeps the preference from ever destroying content. Deriving that here rather than setting
   * a mode signal at each call site makes it structurally true instead of something to remember.
   */
  mode = computed<MarkdownMode>(() => (this.lossy() ? 'source' : this.settingsStore.markdownMode()));

  /**
   * Built when WYSIWYG mode first becomes effective rather than up front - a schema can hold many
   * markdown fields, and a source-preferring author never opens one of them in WYSIWYG mode.
   */
  editor = signal<Editor | null>(null);

  /** Whether the stored markdown holds constructs WYSIWYG mode would destroy. */
  lossy = signal(false);

  modeTooltip = computed(() => {
    if (this.mode() === 'wysiwyg') return 'Edit as Markdown';
    if (this.lossy()) return 'The visual editor cannot represent the HTML or footnotes in this field';
    return 'Edit in the visual editor';
  });

  constructor() {
    // Re-subscribes if the bound control is swapped out, so `lossy` always tracks the live value.
    effect(onCleanup => {
      const control = this.form();
      this.lossy.set(hasUnsupportedMarkdown(control.value));
      const subscription = control.valueChanges.subscribe(value => this.lossy.set(hasUnsupportedMarkdown(value)));
      onCleanup(() => subscription.unsubscribe());
    });

    // Loading the editor reactively rather than from the toggle handler is what makes a remembered
    // `wysiwyg` preference work: on a reload there is no click to hang the setup off.
    effect(() => {
      if (this.mode() !== 'wysiwyg') return;
      const control = this.form();
      untracked(() => {
        const editor = this.ensureEditor();
        editor.setEditable(!control.disabled, false);
        // `emitUpdate: false` matters: merely looking at a document must not rewrite the stored
        // markdown. Only a real edit writes back, through the `update` handler in `ensureEditor`.
        editor.commands.setContent(control.value ?? '', { contentType: 'markdown', emitUpdate: false });
      });
    });
  }

  toggleMode(): void {
    if (this.mode() === 'wysiwyg') {
      this.settingsStore.setMarkdownMode('source');
      return;
    }
    // Checked again here rather than trusting `lossy` alone: this is the point where content would
    // actually be destroyed, so it is the one place the guard has to be correct.
    if (hasUnsupportedMarkdown(this.form().value)) {
      this.notificationService.error(
        'This field contains HTML or footnotes, which the visual editor cannot represent. Edit it as Markdown.',
      );
      return;
    }
    this.settingsStore.setMarkdownMode('wysiwyg');
  }

  translate(fieldName: string, sourceLocale: string, targetLocale: string): void {
    // get source locale content
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
            this.applyValue(result);
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

  /**
   * Writes markdown that came from outside the editor (an AI translation) into the form, keeping
   * WYSIWYG mode in sync.
   *
   * `setValue` fires `valueChanges` synchronously, so a translation carrying HTML has already
   * flipped `lossy` - and with it `mode` - by the time this reads it: the field drops to source
   * without the author's stored preference changing.
   */
  private applyValue(markdown: string): void {
    this.form().setValue(markdown);
    if (this.mode() !== 'wysiwyg') return;
    this.editor()?.commands.setContent(markdown, { contentType: 'markdown', emitUpdate: false });
  }

  private ensureEditor(): Editor {
    const existing = untracked(this.editor);
    if (existing) return existing;
    const editor = new Editor({
      // Same placeholder source mode shows, so both modes hint the default locale's value.
      extensions: createMarkdownExtensions({ placeholder: this.default() }),
      editorProps: {
        attributes: {
          class: 'p-2 border-color rounded-b-md outline-hidden',
          spellcheck: 'false',
        },
      },
    });
    // The form control is the single source of truth and always holds markdown, in both modes.
    // ngx-tiptap's own value accessor only emits `json` or `html`, so the control is bound by hand
    // here instead of with `[formControl]`.
    editor.on('update', ({ editor }) => this.form().setValue(editor.getMarkdown()));
    this.editor.set(editor);
    return editor;
  }

  ngOnDestroy(): void {
    this.editor()?.destroy();
  }
}
