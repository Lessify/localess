/* tslint:disable */
/* eslint-disable */

/**
 * Scim Error
 */
export interface ScimError {
  detail?: string | null;
  documentation_url?: string | null;
  message?: string | null;
  schemas?: Array<string>;
  scimType?: string | null;
  status?: number;
}
