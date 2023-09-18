/* tslint:disable */
/* eslint-disable */

/**
 * Git references within a repository
 */
export interface GitRef {
  node_id: string;
  object: {
'type': string;

/**
 * SHA for the reference
 */
'sha': string;
'url': string;
};
  ref: string;
  url: string;
}
