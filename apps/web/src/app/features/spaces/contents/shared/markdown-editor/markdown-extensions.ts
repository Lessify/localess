import Blockquote from '@tiptap/extension-blockquote';
import Bold from '@tiptap/extension-bold';
import Code from '@tiptap/extension-code';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Document from '@tiptap/extension-document';
import HardBreak from '@tiptap/extension-hard-break';
import Heading from '@tiptap/extension-heading';
import History from '@tiptap/extension-history';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import Image from '@tiptap/extension-image';
import Italic from '@tiptap/extension-italic';
import Link from '@tiptap/extension-link';
import { BulletList, ListItem, OrderedList, TaskItem, TaskList } from '@tiptap/extension-list';
import Paragraph from '@tiptap/extension-paragraph';
import Placeholder from '@tiptap/extension-placeholder';
import Strike from '@tiptap/extension-strike';
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table';
import Text from '@tiptap/extension-text';
import Underline from '@tiptap/extension-underline';
import { Markdown } from '@tiptap/markdown';

import { createRichTextLowlight } from '../rich-text-editor/lowlight';

/**
 * Underline that serializes to `<u>text</u>` rather than TipTap's default `++text++`.
 *
 * Markdown has no underline syntax. `++text++` is a Pandoc-style extension that CommonMark and GFM
 * renderers print literally, so a consumer would see the plus signs; inline HTML *is* part of
 * CommonMark and renders as an underline everywhere. `<u>` also parses straight back into this mark
 * - TipTap resolves HTML tags against the registered schema - so the round trip is stable, and the
 * inherited `++` tokenizer still reads anything written before this change.
 *
 * This is what lets the MARKDOWN and RICH_TEXT editors offer the same toolbar. {@link
 * hasUnsupportedMarkdown} allows `<u>` for the same reason.
 */
const HtmlUnderline = Underline.extend({
  renderMarkdown(node, helpers) {
    return `<u>${helpers.renderChildren(node)}</u>`;
  },
});

/**
 * Extensions for the WYSIWYG mode of the markdown editor.
 *
 * The rule here is **register wide, expose narrow**: a MARKDOWN field stores whatever markdown an
 * author typed, and TipTap can only represent constructs it has an extension for. Anything else is
 * dropped the moment the document is serialized back with `getMarkdown()` - a table silently
 * becomes an empty string, an image collapses to its alt text. So every construct that may already
 * exist in stored markdown has to be registered even when no toolbar button can create it
 * ({@link Image} and the table nodes are the cases in point).
 *
 * Underline is included via {@link HtmlUnderline}, which replaces TipTap's non-standard `++text++`
 * output with `<u>text</u>` so the MARKDOWN editor can offer the same toolbar as the RICH_TEXT one.
 *
 * Constructs that survive a parse/serialize round trip with this set are asserted in the spec; the
 * ones that cannot are listed in {@link hasUnsupportedMarkdown}.
 */
export function createMarkdownExtensions(options: { placeholder?: string } = {}) {
  return [
    Markdown,
    Document,
    Text,
    Paragraph,
    Heading.configure({ levels: [1, 2, 3, 4, 5, 6] }),
    Bold,
    Italic,
    Strike,
    HtmlUnderline,
    Code,
    CodeBlockLowlight.configure({ lowlight: createRichTextLowlight() }),
    Link.configure({ openOnClick: false, autolink: true }),
    ListItem,
    OrderedList,
    BulletList,
    TaskList,
    TaskItem,
    Blockquote,
    HorizontalRule,
    HardBreak,
    Image,
    Table,
    TableRow,
    TableCell,
    TableHeader,
    Placeholder.configure({ placeholder: options.placeholder ?? '' }),
    History,
  ];
}

/** Fenced (``` / ~~~) and inline code spans, where HTML is just text and round trips untouched. */
const CODE_SPANS = /```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]*`/g;
/** An HTML open or close tag. */
const HTML_TAG = /<\/?[a-zA-Z][^>]*>/;
/** `<u>` is written by the editor itself ({@link HtmlUnderline}) and parses back into a mark. */
const UNDERLINE_TAG = /<\/?u\s*>/gi;
/** A GFM footnote definition, e.g. `[^1]: the note`. */
const FOOTNOTE_DEFINITION = /^\s*\[\^[^\]]+]:/m;

/**
 * Whether `markdown` contains constructs the WYSIWYG mode would destroy.
 *
 * Raw HTML is escaped on the way back out (`<div>` becomes `&lt;div&gt;`) and GFM footnotes are
 * mangled (`[^1]: note` becomes `[^1](note)`), so a document containing either must not be opened
 * in WYSIWYG mode - the editor disables the toggle instead.
 *
 * Two things are stripped before scanning: code spans, because HTML inside a code block is content
 * rather than markup and round trips intact, and `<u>` tags, which the editor writes itself and
 * reads straight back. Erring towards `true` is the safe direction: a false positive only costs the
 * author the WYSIWYG toggle, while a false negative costs them their content.
 */
export function hasUnsupportedMarkdown(markdown: string | null | undefined): boolean {
  if (!markdown) return false;
  const scannable = markdown.replace(CODE_SPANS, '').replace(UNDERLINE_TAG, '');
  return HTML_TAG.test(scannable) || FOOTNOTE_DEFINITION.test(scannable);
}
