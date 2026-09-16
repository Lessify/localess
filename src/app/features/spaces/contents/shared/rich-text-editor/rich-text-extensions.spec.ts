import { generateHTML, generateJSON, JSONContent } from '@tiptap/core';

import { createRichTextExtensions } from './rich-text-extensions';

function roundTrip(json: JSONContent): JSONContent {
  const extensions = createRichTextExtensions();
  return generateJSON(generateHTML(json, extensions), extensions);
}

function paragraph(content: JSONContent[]): JSONContent {
  return { type: 'doc', content: [{ type: 'paragraph', content }] };
}

describe('rich text extensions', () => {
  /**
   * Translating a RICH_TEXT field converts the stored document to HTML, sends it to the provider,
   * and parses the returned HTML back. That only preserves the author's content if HTML is a
   * lossless interchange format for this schema - so each case below asserts the document survives
   * the trip. A node or mark missing from `createRichTextExtensions` does not error here either:
   * it is silently dropped, which is exactly the failure this guards.
   */
  describe('survives a JSON -> HTML -> JSON round trip', () => {
    const cases: Record<string, JSONContent> = {
      text: paragraph([{ type: 'text', text: 'Hello' }]),
      bold: paragraph([{ type: 'text', text: 'Hello', marks: [{ type: 'bold' }] }]),
      italic: paragraph([{ type: 'text', text: 'Hello', marks: [{ type: 'italic' }] }]),
      strike: paragraph([{ type: 'text', text: 'Hello', marks: [{ type: 'strike' }] }]),
      underline: paragraph([{ type: 'text', text: 'Hello', marks: [{ type: 'underline' }] }]),
      inlineCode: paragraph([{ type: 'text', text: 'const a = 1', marks: [{ type: 'code' }] }]),
      mixedMarks: paragraph([
        { type: 'text', text: 'plain ' },
        { type: 'text', text: 'bold', marks: [{ type: 'bold' }] },
        { type: 'text', text: ' and ' },
        { type: 'text', text: 'italic', marks: [{ type: 'italic' }] },
      ]),
      heading: { type: 'doc', content: [{ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Title' }] }] },
      blockquote: {
        type: 'doc',
        content: [{ type: 'blockquote', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'quoted' }] }] }],
      },
      horizontalRule: { type: 'doc', content: [{ type: 'horizontalRule' }] },
      bulletList: {
        type: 'doc',
        content: [
          {
            type: 'bulletList',
            content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'one' }] }] }],
          },
        ],
      },
    };

    for (const [name, json] of Object.entries(cases)) {
      it(name, () => {
        expect(roundTrip(json)).toEqual(json);
      });
    }

    // `toMatchObject` rather than `toEqual` for the rest, because parsing fills in attributes the
    // input did not name: Link and CodeBlock render their configured defaults (target, rel, class)
    // into the HTML, and an ordered list picks up TipTap's `type: null` marker attribute. Those are
    // added defaults, not lost content, which is what these assertions are checking for.
    it('keeps an ordered list and its start', () => {
      const json: JSONContent = {
        type: 'doc',
        content: [
          {
            type: 'orderedList',
            attrs: { start: 1 },
            content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'first' }] }] }],
          },
        ],
      };

      expect(roundTrip(json)).toMatchObject({
        content: [{ type: 'orderedList', attrs: { start: 1 }, content: [{ type: 'listItem' }] }],
      });
    });

    it('keeps a link and its href', () => {
      const json = paragraph([{ type: 'text', text: 'site', marks: [{ type: 'link', attrs: { href: 'https://example.com' } }] }]);

      expect(roundTrip(json)).toMatchObject({
        content: [{ content: [{ text: 'site', marks: [{ type: 'link', attrs: { href: 'https://example.com' } }] }] }],
      });
    });

    it('keeps a code block and its language', () => {
      const json: JSONContent = {
        type: 'doc',
        content: [{ type: 'codeBlock', attrs: { language: 'typescript' }, content: [{ type: 'text', text: 'const a = 1;' }] }],
      };

      expect(roundTrip(json)).toMatchObject({
        content: [{ type: 'codeBlock', attrs: { language: 'typescript' }, content: [{ text: 'const a = 1;' }] }],
      });
    });
  });

  it('renders marks as the HTML tags a translation provider passes through untouched', () => {
    const json = paragraph([{ type: 'text', text: 'Hello', marks: [{ type: 'bold' }] }]);

    expect(generateHTML(json, createRichTextExtensions())).toBe('<p><strong>Hello</strong></p>');
  });
});
