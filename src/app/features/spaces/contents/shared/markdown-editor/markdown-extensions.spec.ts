import { MarkdownManager } from '@tiptap/markdown';

import { createMarkdownExtensions, hasUnsupportedMarkdown } from './markdown-extensions';

function roundTrip(markdown: string): string {
  const manager = new MarkdownManager({ extensions: createMarkdownExtensions() });
  return manager.serialize(manager.parse(markdown));
}

describe('markdown extensions', () => {
  /**
   * The regression net for "register wide, expose narrow". A MARKDOWN field stores author-written
   * markdown, and WYSIWYG mode rewrites the whole document through `getMarkdown()` on every edit -
   * so any construct without a registered extension is destroyed, not merely unstyled. Dropping
   * `Image` turns `![alt](src)` into the bare word `alt`; dropping the table nodes turns a table
   * into an empty string. Each case below fails loudly if its extension goes missing.
   */
  describe('survives a parse/serialize round trip', () => {
    const cases: Record<string, string> = {
      heading: '## Hello world',
      marks: 'Some **bold**, *italic*, ~~strike~~ and `inline code`.',
      link: 'A [link](https://example.com) here.',
      bulletList: '- one\n- two',
      nestedBulletList: '- one\n- two\n  - nested',
      orderedList: '1. first\n2. second',
      fencedCodeWithLanguage: '```typescript\nconst answer: number = 42;\n```',
      blockquote: '> quoted text',
      horizontalRule: 'before\n\n---\n\nafter',
      table: '| a | b |\n| --- | --- |\n| 1 | 2 |',
      image: '![alt](https://example.com/x.png)',
      taskList: '- [ ] todo\n- [x] done',
      hardBreak: 'line one  \nline two',
      blockquotedList: '> - a\n> - b',
    };

    for (const [name, markdown] of Object.entries(cases)) {
      it(name, () => {
        // Whitespace is normalized because the serializer is free to pick its own blank-line and
        // indentation style; what must not change is the content and the markup itself.
        const normalize = (value: string) => value.replace(/\s+/g, ' ').trim();

        expect(normalize(roundTrip(markdown))).toBe(normalize(markdown));
      });
    }

    it('keeps the language attribute on a fenced code block, so highlighting survives', () => {
      const manager = new MarkdownManager({ extensions: createMarkdownExtensions() });

      const doc = manager.parse('```typescript\nconst a = 1;\n```');

      expect(doc.content?.[0]).toMatchObject({ type: 'codeBlock', attrs: { language: 'typescript' } });
    });

    // HTML inside a code span is content rather than markup, so it has to come back verbatim
    // instead of being escaped the way a raw HTML block is.
    it('leaves HTML inside a fenced code block untouched', () => {
      const markdown = '```html\n<div class="cb">callout</div>\n```';

      expect(roundTrip(markdown)).toContain('<div class="cb">callout</div>');
    });
  });

  /**
   * Known, accepted normalization: GFM tokenizes a bare URL as a link, so the serializer writes it
   * back in explicit `[url](url)` form. The stored markdown changes but renders identically through
   * any markdown parser, which is why `hasUnsupportedMarkdown` deliberately does not flag it -
   * doing so would disable WYSIWYG mode for most real documents.
   */
  it('normalizes a bare URL to explicit link syntax', () => {
    expect(roundTrip('visit https://example.com now')).toBe('visit [https://example.com](https://example.com) now');
  });

  describe('hasUnsupportedMarkdown', () => {
    // Each `true` case below is paired with proof that the round trip really does corrupt it, so
    // the guard and the serializer's actual behaviour cannot drift apart unnoticed. The assertions
    // deliberately only require that the construct does not survive, not *how* it is lost: in the
    // browser the tags are stripped and their text kept, while a DOM-less environment escapes them
    // to `&lt;div&gt;` instead. Both are data loss, and the guard is what prevents either.
    it('flags a raw HTML block, which the round trip destroys', () => {
      const markdown = '<div class="cb">callout</div>';

      expect(roundTrip(markdown)).not.toContain('<div');
      expect(hasUnsupportedMarkdown(markdown)).toBe(true);
    });

    it('flags inline HTML, which the round trip destroys', () => {
      const markdown = 'text with <sup>sup</sup> tag';

      expect(roundTrip(markdown)).not.toContain('<sup>');
      expect(hasUnsupportedMarkdown(markdown)).toBe(true);
    });

    it('flags a footnote definition, which the round trip mangles', () => {
      const markdown = 'ref[^1]\n\n[^1]: note';

      expect(roundTrip(markdown)).not.toContain('[^1]: note');
      expect(hasUnsupportedMarkdown(markdown)).toBe(true);
    });

    it('does not flag HTML inside a fenced code block', () => {
      expect(hasUnsupportedMarkdown('```html\n<div>callout</div>\n```')).toBe(false);
    });

    it('does not flag HTML inside an inline code span', () => {
      expect(hasUnsupportedMarkdown('use the `<div>` element')).toBe(false);
    });

    it('does not flag markdown made only of supported constructs', () => {
      expect(hasUnsupportedMarkdown('# Title\n\n- [x] done\n\n| a |\n| --- |\n| 1 |')).toBe(false);
    });

    it('does not flag empty input', () => {
      expect(hasUnsupportedMarkdown('')).toBe(false);
      expect(hasUnsupportedMarkdown(null)).toBe(false);
      expect(hasUnsupportedMarkdown(undefined)).toBe(false);
    });

    it('does not flag a less-than sign that is not a tag', () => {
      expect(hasUnsupportedMarkdown('1 < 2 and 3 > 2')).toBe(false);
    });
  });

  /**
   * Underline is what makes a shared toolbar possible across both field kinds. TipTap's default
   * `++text++` would render literally in any CommonMark/GFM consumer, so the mark is overridden to
   * emit inline HTML instead.
   */
  describe('underline', () => {
    it('is registered, so the toolbar can match the rich text editor', () => {
      const names = createMarkdownExtensions().map(extension => extension.name);

      expect(names).toContain('underline');
    });

    it('serializes to <u> rather than the non-standard ++text++', () => {
      const manager = new MarkdownManager({ extensions: createMarkdownExtensions() });
      const doc = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'under', marks: [{ type: 'underline' }] }] }] };

      expect(manager.serialize(doc)).toBe('<u>under</u>');
    });

    it('round trips its own output', () => {
      expect(roundTrip('<u>under</u>')).toBe('<u>under</u>');
    });

    // The inherited `++` tokenizer is kept, so fields written before the override still load.
    it('still reads legacy ++text++ content and upgrades it', () => {
      expect(roundTrip('legacy ++under++ text')).toBe('legacy <u>under</u> text');
    });

    it('is not treated as unsupported HTML by the guard', () => {
      expect(hasUnsupportedMarkdown('an <u>underlined</u> word')).toBe(false);
    });

    it('does not let other tags through alongside it', () => {
      expect(hasUnsupportedMarkdown('<u>ok</u> but <div>not</div>')).toBe(true);
    });
  });
});
