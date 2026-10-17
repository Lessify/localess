import { describe, expect, it } from 'vitest';
import { contentRefs } from './content-refs.js';

describe('contentRefs', () => {
  it('lists the assets, references and content links used anywhere in a document, in every locale', () => {
    const refs = contentRefs({
      _id: 'doc',
      _schema: 'page',
      image: { kind: 'ASSET', uri: 'a2' },
      image_i18n_de: { kind: 'ASSET', uri: 'a1' },
      author: { kind: 'REFERENCE', uri: 'r1' },
      related: [
        { kind: 'REFERENCE', uri: 'r2' },
        { kind: 'REFERENCE', uri: 'r1' },
      ],
      site: { kind: 'LINK', type: 'url', target: '_blank', uri: 'https://example.com' },
      site_i18n_fr: { kind: 'LINK', type: 'content', target: '_self', uri: 'c1' },
      blocks: [
        {
          _id: 'b1',
          _schema: 'card',
          gallery: [
            { kind: 'ASSET', uri: 'a3' },
            { kind: 'ASSET', uri: 'a2' },
          ],
        },
      ],
      title: 'Not a reference',
    });
    expect(refs).toEqual({ assets: ['a1', 'a2', 'a3'], references: ['r1', 'r2'], links: ['c1'] });
  });
});
