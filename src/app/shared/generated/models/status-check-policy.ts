/* tslint:disable */
/* eslint-disable */

/**
 * Status Check Policy
 */
export interface StatusCheckPolicy {
  checks: Array<{
'context': string;
'app_id': number | null;
}>;
  contexts: Array<string>;
  contexts_url: string;
  strict: boolean;
  url: string;
}
