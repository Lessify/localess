/**
 * What the "Contents (all fields)" test template (`contents_fields`) holds, restated from its rule
 * (docs/superpowers/plans/2026-10-17-contents-template.md), not imported from the server: a mistake in the template must
 * fail a test, not move its expectation. Nothing is published; ids differ per run (find items by name).
 */
export const FIELDS = {
  template: 'contents_fields',
  locales: ['en', 'de', 'fr'] as const,
  documents: { plain: 'All fields (plain)', translated: 'All fields (translated)', nested: 'Nested page' },
  targets: ['Alpha', 'Beta', 'Gamma'],
  files: ['blue.jpg', 'readme.txt', 'red.png'],
  /** The plain document's values: the same in every locale. */
  plain: {
    text: 'Plain text',
    textarea: 'Plain textarea',
    markdown: '**Plain** markdown',
    number: 7,
    color: '#336699',
    date: '2026-01-15',
    datetime: '2026-01-15T09:30',
    boolean: true,
    option: 'green',
    options: ['red', 'blue'],
    link: { kind: 'LINK', type: 'url', target: '_blank', uri: 'https://example.com/plain' },
  },
} as const;

export type FieldsLocale = (typeof FIELDS.locales)[number];

/** The translated document's own values in a locale (what the CDN delivers for it). */
export function translated(locale: FieldsLocale) {
  const i = FIELDS.locales.indexOf(locale) + 1;
  return {
    text: `Text (${locale})`,
    textarea: `Textarea (${locale})`,
    markdown: `**Markdown** (${locale})`,
    number: 10 * i,
    color: ['#ff0000', '#00ff00', '#0000ff'][i - 1],
    date: `2026-0${i}-01`,
    datetime: `2026-0${i}-01T12:00`,
    boolean: [true, false, true][i - 1],
    option: ['red', 'green', 'blue'][i - 1],
    options: [['red'], ['red', 'green'], ['green', 'blue']][i - 1],
  };
}

/** The title at level n (1–5) of the nested page; level 0 is the page itself. */
export function levelTitle(n: number, locale: FieldsLocale): string {
  return n === 0 ? `Nested page (${locale})` : `Level ${n} (${locale})`;
}
