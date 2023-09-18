/* tslint:disable */
/* eslint-disable */

/**
 * Protected Branch Required Status Check
 */
export interface ProtectedBranchRequiredStatusCheck {
  checks: Array<{
'context': string;
'app_id': number | null;
}>;
  contexts: Array<string>;
  contexts_url?: string;
  enforcement_level?: string;
  strict?: boolean;
  url?: string;
}
