import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, OnDestroy } from '@angular/core';
import { AbstractControl, ReactiveFormsModule } from '@angular/forms';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { SchemaFieldRichText } from '@shared/models/schema.model';
import { LocalSettingsStore } from '@shared/stores/local-settings.store';
import { Editor, Extension } from '@tiptap/core';
import Bold from '@tiptap/extension-bold';
import BulletList from '@tiptap/extension-bullet-list';
import Code from '@tiptap/extension-code';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Document from '@tiptap/extension-document';
import Heading from '@tiptap/extension-heading';
import History from '@tiptap/extension-history';
import Italic from '@tiptap/extension-italic';
import Link from '@tiptap/extension-link';
import ListItem from '@tiptap/extension-list-item';
import OrderedList from '@tiptap/extension-ordered-list';
import Paragraph from '@tiptap/extension-paragraph';
import Placeholder from '@tiptap/extension-placeholder';
import Strike from '@tiptap/extension-strike';
import Text from '@tiptap/extension-text';
import Underline from '@tiptap/extension-underline';
import { common, createLowlight } from 'lowlight';
import { TiptapEditorDirective } from 'ngx-tiptap';

@Component({
  selector: 'll-rich-text-editor',
  templateUrl: './rich-text-editor.component.html',
  styleUrls: ['./rich-text-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
    CommonModule,
    TiptapEditorDirective,
    ReactiveFormsModule,
    MatDividerModule,
  ],
})
export class RichTextEditorComponent implements OnDestroy {
  readonly fe = inject(FormErrorHandlerService);

  // Input
  form = input.required<AbstractControl>();
  component = input.required<SchemaFieldRichText>();

  fnKey: string = /(Mac|iPhone|iPod|iPad)/i.test(window.navigator.userAgent) ? 'Cmd' : 'Ctrl';

  //Settings
  settingsStore = inject(LocalSettingsStore);
  lowlight = createLowlight(common);

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
        class: 'p-2 border-color rounded-b-md outline-none',
        spellcheck: 'false',
      },
    },
  });

  setLink(): void {
    const previousUrl = this.editor.getAttributes('link')['href'];
    const url = window.prompt('URL', previousUrl);
    // cancelled
    if (url === null) {
      return;
    }
    // empty
    if (url === '') {
      this.editor.chain().focus().unsetLink().run();
      return;
    }
    // update link
    this.editor.chain().focus().setLink({ href: url, target: '_blank' }).run();
  }

  ngOnDestroy(): void {
    this.editor.destroy();
  }
}
