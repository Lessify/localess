/* tslint:disable */
/* eslint-disable */

/**
 * Validation Error
 */
export interface ValidationError {
  documentation_url: string;
  errors?: Array<{
'resource'?: string;
'field'?: string;
'message'?: string;
'code': string;
'index'?: number;
'value'?: (string | null | number | null | Array<string> | null);
}>;
  message: string;
}
