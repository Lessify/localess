import { TokenType } from '@localess/shared';

import { TOKEN_TYPE_INFO, TOKEN_TYPES } from './token.model';

describe('token types', () => {
  it('lists Public, Preview, Management in that order, each with an icon and a description', () => {
    expect(TOKEN_TYPES.map(it => it.type)).toEqual([TokenType.PUBLIC, TokenType.PREVIEW, TokenType.MANAGEMENT]);
    expect(TOKEN_TYPES.map(it => it.label)).toEqual(['Public', 'Preview', 'Management']);
    expect(TOKEN_TYPES.map(it => it.icon)).toEqual(['lucideGlobe', 'lucideEye', 'lucideKeyRound']);
    for (const it of TOKEN_TYPES) expect(it.description.length).toBeGreaterThan(20);
  });

  it('warns about drafts on preview and secrecy on management', () => {
    expect(TOKEN_TYPE_INFO[TokenType.PREVIEW].description).toContain("Don't use it on your production site");
    expect(TOKEN_TYPE_INFO[TokenType.MANAGEMENT].description).toContain('shown only once');
  });
});
