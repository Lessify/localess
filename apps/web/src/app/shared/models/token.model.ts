import { TokenPermission, TokenV2 } from '@localess/shared';

// UI-only token helpers (labels, usage hints, form shape); the token model itself is in @localess/shared.

export type TokenForm = Pick<TokenV2, 'name' | 'permissions' | 'cacheTtl'>;

export const PERMISSION_TEXT: Record<TokenPermission, string> = {
  [TokenPermission.TRANSLATION_PUBLIC]: 'Translation Public',
  [TokenPermission.TRANSLATION_DRAFT]: 'Translation Draft',
  [TokenPermission.CONTENT_PUBLIC]: 'Content Public',
  [TokenPermission.CONTENT_DRAFT]: 'Content Draft',
  [TokenPermission.DEV_TOOLS]: 'Development Tools',
};

export type TokenUsageCategory = 'DEV_TOOLS' | 'SERVER_SIDE' | 'PUBLIC_SAFE' | 'NO_ACCESS';

export interface TokenUsageInfo {
  category: TokenUsageCategory;
  label: string;
  rationale: string;
  variant: 'default' | 'warning';
}

const DRAFT_PERMISSIONS: readonly TokenPermission[] = [TokenPermission.TRANSLATION_DRAFT, TokenPermission.CONTENT_DRAFT];

export function getTokenUsageInfo(permissions: readonly TokenPermission[] | undefined): TokenUsageInfo {
  if (permissions?.includes(TokenPermission.DEV_TOOLS)) {
    return {
      category: 'DEV_TOOLS',
      label: 'Development Tools Only',
      rationale: 'Grants Development Tools access — used via the X-API-KEY header with CLI/dev tools, not for public/client use.',
      variant: 'default',
    };
  }
  if (permissions?.some(p => DRAFT_PERMISSIONS.includes(p))) {
    return {
      category: 'SERVER_SIDE',
      label: 'Server-side only',
      rationale: 'Grants draft (unpublished) access — keep this token secret and use only from a trusted backend or dev environment.',
      variant: 'default',
    };
  }
  if (permissions && permissions.length > 0) {
    return {
      category: 'PUBLIC_SAFE',
      label: 'Public-safe',
      rationale: 'Only grants access to published content — safe to embed in public-facing apps.',
      variant: 'default',
    };
  }
  return {
    category: 'NO_ACCESS',
    label: 'No access',
    rationale: "This token won't grant access to anything yet.",
    variant: 'warning',
  };
}
