import type { TokenType } from '@localess/shared';

/** A space API token as the public APIs see it. */
export interface ApiToken {
  /** The row's UUID, not the value. */
  id: string;
  type: TokenType;
  cacheTtl: number | null;
}
