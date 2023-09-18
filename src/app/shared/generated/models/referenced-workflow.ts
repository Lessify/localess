/* tslint:disable */
/* eslint-disable */

/**
 * A workflow referenced/reused by the initial caller workflow
 */
export interface ReferencedWorkflow {
  path: string;
  ref?: string;
  sha: string;
}
