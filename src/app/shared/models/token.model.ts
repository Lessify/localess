import { FieldValue } from '@angular/fire/firestore';

export enum TokenPermission {
  PUBLIC = 'PUBLIC',
  DRAFT = 'DRAFT',
  DEV_TOOLS = 'DEV_TOOLS',
}

export type Token = TokenV1 | TokenV2;

export type TokenV1 = TokenBase;

export interface TokenV2 extends TokenBase {
  version: 2;
  permissions: TokenPermission[];
}
export interface TokenBase {
  id: string;
  version?: number;
  name: string;
  createdAt: FieldValue;
  updatedAt: FieldValue;
}

// Form Edit model
export type TokenForm = Pick<TokenV2, 'name' | 'permissions'>;

// Firestore create model
export type TokenFS = Omit<TokenV2, 'id'>;

export function isTokenV2(token: Token): token is TokenV2 {
  return token.version === 2;
}
