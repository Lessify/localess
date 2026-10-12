import type { Timestamp } from './timestamp.js';

export enum TokenPermission {
  TRANSLATION_PUBLIC = 'TRANSLATION_PUBLIC',
  TRANSLATION_DRAFT = 'TRANSLATION_DRAFT',
  CONTENT_PUBLIC = 'CONTENT_PUBLIC',
  CONTENT_DRAFT = 'CONTENT_DRAFT',
  DEV_TOOLS = 'DEV_TOOLS',
}

/** A space API token: what it may do is the list of `permissions`. */
export interface Token {
  id: string;
  /** The secret used as `?token=` / `X-API-KEY` (20 alphanumerics); `id` is only the row's UUID. */
  token: string;
  name: string;
  permissions: TokenPermission[];
  /** Seconds the `cv` redirect is cached (0: not cached); absent: the default. */
  cacheTtl?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
