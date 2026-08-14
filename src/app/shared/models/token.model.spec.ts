import { getTokenUsageInfo, TOKEN_V1_IMPLICIT_PERMISSIONS, TokenPermission } from './token.model';

describe('getTokenUsageInfo()', () => {
  it('classifies no permissions as NO_ACCESS', () => {
    expect(getTokenUsageInfo(undefined)).toEqual({
      category: 'NO_ACCESS',
      label: 'No access',
      rationale: "This token won't grant access to anything yet.",
      variant: 'warning',
    });
    expect(getTokenUsageInfo([])).toEqual(expect.objectContaining({ category: 'NO_ACCESS' }));
  });

  it('classifies only *_PUBLIC permissions as PUBLIC_SAFE', () => {
    const info = getTokenUsageInfo([TokenPermission.CONTENT_PUBLIC, TokenPermission.TRANSLATION_PUBLIC]);

    expect(info).toEqual({
      category: 'PUBLIC_SAFE',
      label: 'Public-safe',
      rationale: 'Only grants access to published content — safe to embed in public-facing apps.',
      variant: 'default',
    });
  });

  it('classifies any *_DRAFT permission as SERVER_SIDE', () => {
    const info = getTokenUsageInfo([TokenPermission.CONTENT_PUBLIC, TokenPermission.CONTENT_DRAFT]);

    expect(info).toEqual({
      category: 'SERVER_SIDE',
      label: 'Server-side only',
      rationale: 'Grants draft (unpublished) access — keep this token secret and use only from a trusted backend or dev environment.',
      variant: 'default',
    });
  });

  it('classifies DEV_TOOLS as DEV_TOOLS regardless of other permissions', () => {
    const info = getTokenUsageInfo([TokenPermission.CONTENT_PUBLIC, TokenPermission.CONTENT_DRAFT, TokenPermission.DEV_TOOLS]);

    expect(info).toEqual({
      category: 'DEV_TOOLS',
      label: 'Development Tools Only',
      rationale: 'Grants Development Tools access — used via the X-API-KEY header with CLI/dev tools, not for public/client use.',
      variant: 'default',
    });
  });

  it('exposes the TokenV1 implicit permission set', () => {
    expect(TOKEN_V1_IMPLICIT_PERMISSIONS).toEqual([
      TokenPermission.TRANSLATION_PUBLIC,
      TokenPermission.TRANSLATION_DRAFT,
      TokenPermission.CONTENT_PUBLIC,
      TokenPermission.CONTENT_DRAFT,
    ]);
    expect(getTokenUsageInfo(TOKEN_V1_IMPLICIT_PERMISSIONS)).toEqual(expect.objectContaining({ category: 'SERVER_SIDE' }));
  });
});
