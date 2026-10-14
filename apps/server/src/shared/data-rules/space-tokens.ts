import { TokenType } from '@localess/shared';
import { newUuid } from '../../infra/database/id.js';
import { tokens } from '../../infra/database/schema.js';
import type { Transaction } from '../../infra/database/transaction.js';
import { newApiToken, tokenColumns } from '../utils/api-token-format.js';

/*
 * Every space starts with one preview token (docs/auth-tokens.md), so preview sites, the Visual Editor and the app's draft
 * links work without setting anything up. Whoever inserts a space (the spaces module, the starter space, the Firebase import) writes it in
 * the same transaction. Afterwards it is an ordinary token: it can be renamed, regenerated or deleted.
 */

export const AUTO_PREVIEW_TOKEN_NAME = 'Auto Generated Preview Token';

export async function createPreviewToken(tx: Transaction, spaceId: string): Promise<void> {
  const value = newApiToken(TokenType.PREVIEW);
  await tx.insert(tokens).values({
    id: newUuid(),
    spaceId,
    type: TokenType.PREVIEW,
    name: AUTO_PREVIEW_TOKEN_NAME,
    ...tokenColumns(TokenType.PREVIEW, value),
  });
}
