import type { Timestamp } from './timestamp.js';

/** What a space API token is for; its value starts with the type's prefix (`pub_`, `prv_`, `mgt_`). */
export enum TokenType {
  /** Published content and translations on the CDN API; safe in browser code. */
  PUBLIC = 'public',
  /** Drafts and published on the CDN API: preview sites, the Visual Editor. */
  PREVIEW = 'preview',
  /** The Management API (CLI, CI), `Authorization: Bearer` only; stored hashed, shown once. */
  MANAGEMENT = 'management',
}

/** A space API token. */
export interface Token {
  id: string;
  type: TokenType;
  name: string;
  /** The prefix and the last 4 characters of the value, e.g. `mgt_…aB3x`. */
  hint: string;
  /** The value: always for public and preview tokens; for management tokens only in the create and regenerate responses. */
  token?: string;
  /** Seconds the `cv` redirect is cached (0: not cached); absent: the default. Public and preview only. */
  cacheTtl?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
