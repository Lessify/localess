import { ChangeDetectionStrategy, Component, computed, effect, input, signal } from '@angular/core';
import { provideIcons } from '@ng-icons/core';
import {
  lucideBold,
  lucideCode,
  lucideCodeSquare,
  lucideHeading1,
  lucideHeading2,
  lucideHeading3,
  lucideHeading4,
  lucideHeading5,
  lucideHeading6,
  lucideItalic,
  lucideLink,
  lucideList,
  lucideListOrdered,
  lucideMinus,
  lucidePilcrow,
  lucideQuote,
  lucideStrikethrough,
  lucideUnderline,
} from '@ng-icons/lucide';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmSeparatorImports } from '@spartan-ng/helm/separator';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { Editor } from '@tiptap/core';

/** Which marks and nodes are active at the cursor. Keys match the toolbar's buttons. */
export type EditorActiveState = Record<string, boolean>;

/**
 * Schema types the toolbar's buttons act on.
 *
 * Both field editors assert their own extension set against these lists, which is what stops a
 * button from shipping without the mark or node behind it - the failure mode otherwise is a button
 * that looks fine and silently does nothing.
 */
export const TOOLBAR_REQUIRED_MARKS = ['bold', 'italic', 'strike', 'underline', 'code', 'link'];
export const TOOLBAR_REQUIRED_NODES = [
  'paragraph',
  'heading',
  'orderedList',
  'bulletList',
  'listItem',
  'blockquote',
  'codeBlock',
  'horizontalRule',
];

/** Reads every state the toolbar renders in one pass, so a transaction costs a single refresh. */
export function readActiveState(editor: Editor): EditorActiveState {
  return {
    paragraph: editor.isActive('paragraph'),
    heading1: editor.isActive('heading', { level: 1 }),
    heading2: editor.isActive('heading', { level: 2 }),
    heading3: editor.isActive('heading', { level: 3 }),
    heading4: editor.isActive('heading', { level: 4 }),
    heading5: editor.isActive('heading', { level: 5 }),
    heading6: editor.isActive('heading', { level: 6 }),
    bold: editor.isActive('bold'),
    italic: editor.isActive('italic'),
    strike: editor.isActive('strike'),
    underline: editor.isActive('underline'),
    code: editor.isActive('code'),
    link: editor.isActive('link'),
    orderedList: editor.isActive('orderedList'),
    bulletList: editor.isActive('bulletList'),
    blockquote: editor.isActive('blockquote'),
    codeBlock: editor.isActive('codeBlock'),
  };
}

/**
 * The formatting toolbar shared by the RICH_TEXT and MARKDOWN field editors.
 *
 * It exists so the two editors cannot drift apart: they used to hold two copies of the same ~160
 * lines of button markup, which is how one of them ended up with underline and the other with
 * blockquote and horizontal rule. There is deliberately no input for which buttons to show - every
 * consumer gets the same tools, and both field kinds can represent all of them.
 *
 * `display: contents` on the host keeps the buttons in the flex flow of the input group's addon
 * row, so the host element itself has no layout effect.
 */
@Component({
  selector: 'll-editor-toolbar',
  templateUrl: './editor-toolbar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  imports: [HlmTooltipImports, HlmIconImports, HlmInputGroupImports, HlmSeparatorImports],
  providers: [
    provideIcons({
      lucidePilcrow,
      lucideHeading1,
      lucideHeading2,
      lucideHeading3,
      lucideHeading4,
      lucideHeading5,
      lucideHeading6,
      lucideBold,
      lucideItalic,
      lucideStrikethrough,
      lucideUnderline,
      lucideCode,
      lucideLink,
      lucideListOrdered,
      lucideList,
      lucideQuote,
      lucideCodeSquare,
      lucideMinus,
    }),
  ],
})
export class EditorToolbarComponent {
  /**
   * Null when there is nothing to format yet. The markdown editor renders the toolbar in source
   * mode too - so the row keeps its height instead of the buttons popping in and out on every mode
   * switch - and in that mode the TipTap instance has not been built.
   */
  editor = input.required<Editor | null>();

  /** Set by the host when the buttons should be visible but inactive, e.g. markdown source mode. */
  disabled = input(false);

  /** Buttons are inert whenever the host says so or there is no editor behind them. */
  inert = computed(() => this.disabled() || this.editor() === null);

  fnKey: string = /(Mac|iPhone|iPod|iPad)/i.test(window.navigator.userAgent) ? 'Cmd' : 'Ctrl';

  /**
   * Active states as a signal rather than `editor.isActive(...)` calls in the template.
   *
   * ngx-tiptap marks its *host* view for check on each transaction, which never reaches this child
   * component - its `editor` input keeps the same reference, so under OnPush the buttons would
   * freeze in whatever state they had on first render. Refreshing a signal on `transaction` is what
   * keeps them live.
   */
  active = signal<EditorActiveState>({});

  constructor() {
    effect(onCleanup => {
      const editor = this.editor();
      if (!editor) {
        this.active.set({});
        return;
      }
      const refresh = () => this.active.set(readActiveState(editor));
      refresh();
      editor.on('transaction', refresh);
      onCleanup(() => editor.off('transaction', refresh));
    });
  }

  setLink(): void {
    const editor = this.editor();
    if (!editor) return;
    const previousUrl = editor.getAttributes('link')['href'];
    const url = window.prompt('URL', previousUrl);
    // cancelled
    if (url === null) {
      return;
    }
    // empty
    if (url === '') {
      editor.chain().focus().unsetLink().run();
      return;
    }
    // update link
    editor.chain().focus().setLink({ href: url, target: '_blank' }).run();
  }
}
