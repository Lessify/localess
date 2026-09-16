import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, OnDestroy } from '@angular/core';
import { AbstractControl, ReactiveFormsModule } from '@angular/forms';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { provideIcons } from '@ng-icons/core';
import { lucideInfo, lucideLanguages } from '@ng-icons/lucide';
import { SchemaFieldRichText } from '@shared/models/schema.model';
import { LocalSettingsStore } from '@shared/stores/local-settings.store';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmSeparatorImports } from '@spartan-ng/helm/separator';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { Editor, Extension } from '@tiptap/core';
import Blockquote from '@tiptap/extension-blockquote';
import Bold from '@tiptap/extension-bold';
import BulletList from '@tiptap/extension-bullet-list';
import Code from '@tiptap/extension-code';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Document from '@tiptap/extension-document';
import Heading from '@tiptap/extension-heading';
import History from '@tiptap/extension-history';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import Italic from '@tiptap/extension-italic';
import Link from '@tiptap/extension-link';
import ListItem from '@tiptap/extension-list-item';
import OrderedList from '@tiptap/extension-ordered-list';
import Paragraph from '@tiptap/extension-paragraph';
import Placeholder from '@tiptap/extension-placeholder';
import Strike from '@tiptap/extension-strike';
import Text from '@tiptap/extension-text';
import Underline from '@tiptap/extension-underline';
import { TiptapEditorDirective } from 'ngx-tiptap';

import { EditorToolbarComponent } from '../editor-toolbar/editor-toolbar.component';
import { createRichTextLowlight } from './lowlight';

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

  // Input
  form = input.required<AbstractControl>();
  component = input.required<SchemaFieldRichText>();

  //Settings
  settingsStore = inject(LocalSettingsStore);
  lowlight = createRichTextLowlight();

  editor = new Editor({
    extensions: [
      Extension.create({
        addKeyboardShortcuts() {
          return {
            Tab: ({ editor }) => {
              editor.commands.insertContent('  ');
              return true;
            },
          };
        },
      }),
      Document,
      Text,
      Paragraph,
      Heading.configure({
        levels: [1, 2, 3, 4, 5, 6],
      }),
      Bold,
      Italic,
      Strike,
      Underline,
      Placeholder,
      History,
      ListItem,
      OrderedList,
      BulletList,
      // Backs the blockquote and horizontal rule buttons in the shared toolbar.
      Blockquote,
      HorizontalRule,
      Code,
      CodeBlockLowlight.configure({
        lowlight: this.lowlight,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
    ],
    editorProps: {
      attributes: {
        class: 'p-2 border-color rounded-b-md outline-hidden',
        spellcheck: 'false',
      },
    },
  });

  ngOnDestroy(): void {
    this.editor.destroy();
  }
}
