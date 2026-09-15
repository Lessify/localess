import { createRichTextLowlight, RICH_TEXT_LANGUAGES } from './lowlight';

describe('rich text lowlight', () => {
  it('registers exactly the advertised grammars', () => {
    const lowlight = createRichTextLowlight();

    expect(lowlight.listLanguages().sort()).toEqual(Object.keys(RICH_TEXT_LANGUAGES).sort());
  });

  it('highlights a registered language', () => {
    const lowlight = createRichTextLowlight();

    const tree = lowlight.highlight('typescript', 'const answer: number = 42;');

    expect(tree.children.length).toBeGreaterThan(0);
  });

  it('resolves the short aliases authors type in a code block', () => {
    const lowlight = createRichTextLowlight();

    for (const alias of ['js', 'ts', 'html', 'sh', 'yml', 'py', 'rb', 'cs']) {
      expect(lowlight.registered(alias), `alias ${alias} should resolve`).toBe(true);
    }
  });

  // Guards the bundle win: lowlight's `common` set drags in 37 grammars (~145kB), including
  // languages no CMS code block needs. Switching back would silently re-add ~88kB.
  it('leaves out the grammars that made `common` expensive', () => {
    const lowlight = createRichTextLowlight();

    for (const language of ['arduino', 'swift', 'perl', 'objectivec', 'scss', 'less']) {
      expect(lowlight.registered(language), `${language} should not be registered`).toBe(false);
    }
  });
});
