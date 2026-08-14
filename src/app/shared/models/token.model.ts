import { Timestamp } from '@angular/fire/firestore';

export enum TokenPermission {
  TRANSLATION_PUBLIC = 'TRANSLATION_PUBLIC',
  TRANSLATION_DRAFT = 'TRANSLATION_DRAFT',
  CONTENT_PUBLIC = 'CONTENT_PUBLIC',
  CONTENT_DRAFT = 'CONTENT_DRAFT',
  DEV_TOOLS = 'DEV_TOOLS',
}

export type Token = TokenV1 | TokenV2;

export type TokenV1 = TokenBase & { version: undefined };

export interface TokenV2 extends TokenBase {
  version: 2;
  permissions: TokenPermission[];
  cacheTtl?: number;
}
export interface TokenBase {
  id: string;
  version?: number;
  name: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Form Edit model
export type TokenForm = Pick<TokenV2, 'name' | 'permissions' | 'cacheTtl'>;

// Firestore create model
export type TokenFS = Omit<TokenV2, 'id'>;

export function isTokenV1(token: Token): token is TokenV1 {
  return token.version === undefined;
}

export function isTokenV2(token: Token): token is TokenV2 {
  return token.version === 2;
}

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

export const TOKEN_V1_IMPLICIT_PERMISSIONS: TokenPermission[] = [
  TokenPermission.TRANSLATION_PUBLIC,
  TokenPermission.TRANSLATION_DRAFT,
  TokenPermission.CONTENT_PUBLIC,
  TokenPermission.CONTENT_DRAFT,
];

const DRAFT_PERMISSIONS: readonly TokenPermission[] = [TokenPermission.TRANSLATION_DRAFT, TokenPermission.CONTENT_DRAFT];

export function getTokenUsageInfo(permissions: TokenPermission[] | undefined): TokenUsageInfo {
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
