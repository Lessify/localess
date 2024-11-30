import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, input, OnDestroy } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { SchemaFieldRichText } from '@shared/models/schema.model';
import { LocalSettingsStore } from '@shared/stores/local-settings.store';
import { Editor } from '@tiptap/core';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Strike from '@tiptap/extension-strike';
import Underline from '@tiptap/extension-underline';
import Document from '@tiptap/extension-document';
import Text from '@tiptap/extension-text';
import Paragraph from '@tiptap/extension-paragraph';
import Placeholder from '@tiptap/extension-placeholder';
import History from '@tiptap/extension-history';
import ListItem from '@tiptap/extension-list-item';
import OrderedList from '@tiptap/extension-ordered-list';
import BulletList from '@tiptap/extension-bullet-list';

@Component({
  selector: 'll-rich-text-editor',
  templateUrl: './rich-text-editor.component.html',
  styleUrls: ['./rich-text-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RichTextEditorComponent implements OnDestroy {
  // Input
  form = input.required<AbstractControl>();
  component = input.required<SchemaFieldRichText>();

  //Settings
  settingsStore = inject(LocalSettingsStore);

  editor = new Editor({
    extensions: [Document, Text, Paragraph, Bold, Italic, Strike, Underline, Placeholder, History, ListItem, OrderedList, BulletList],
    editorProps: {
      attributes: {
        class: 'p-2 border-color border rounded-b-md outline-none',
        spellcheck: 'false',
      },
    },
  });

  constructor(
    readonly fe: FormErrorHandlerService,
    private readonly cd: ChangeDetectorRef,
  ) {
  }

  ngOnDestroy(): void {
    this.editor.destroy();
  }
}
