import { Token, TokenType } from '@localess/shared';

// UI-only token helpers (labels, icons, where to use each type); the token model itself is in @localess/shared.

export type TokenForm = Pick<Token, 'name' | 'type' | 'cacheTtl'>;

export interface TokenTypeInfo {
  type: TokenType;
  label: string;
  icon: string;
  description: string;
}

export const TOKEN_TYPES: TokenTypeInfo[] = [
  {
    type: TokenType.PUBLIC,
    label: 'Public',
    icon: 'lucideGlobe',
    description: 'Reads published content and translations. Safe in browser code: websites, mobile apps, static site builds.',
  },
  {
    type: TokenType.PREVIEW,
    label: 'Preview',
    icon: 'lucideEye',
    description:
      "Reads drafts and published content. For preview sites, the Visual Editor and staging builds. Don't use it on your production site.",
  },
  {
    type: TokenType.MANAGEMENT,
    label: 'Management',
    icon: 'lucideKeyRound',
    description:
      'The CLI and CI: push and pull schemas and translations, generate the OpenAPI spec. Secret: sent in the Authorization header, shown only once.',
  },
];

export const TOKEN_TYPE_INFO = Object.fromEntries(TOKEN_TYPES.map(it => [it.type, it])) as Record<TokenType, TokenTypeInfo>;
