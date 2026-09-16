import { Extension } from '@tiptap/core';
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

import { createRichTextLowlight } from './lowlight';

/**
 * Extensions for the RICH_TEXT field editor.
 *
 * Extracted from the component because the schema has a second consumer: translating the field
 * converts the stored JSON to HTML with `generateHTML`, which has to be given the same extension
 * list. A mismatch there does not error - it silently drops whichever nodes the shorter list is
 * missing - so both paths read this one definition.
 */
export function createRichTextExtensions() {
  return [
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
      lowlight: createRichTextLowlight(),
    }),
    Link.configure({
      openOnClick: false,
      autolink: true,
    }),
  ];
}
