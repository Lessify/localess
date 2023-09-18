/* tslint:disable */
/* eslint-disable */

/**
 * Scim Error
 */
export interface ScimError {
  detail?: null | string;
  documentation_url?: null | string;
  message?: null | string;
  schemas?: Array<string>;
  scimType?: null | string;
  status?: number;
}
