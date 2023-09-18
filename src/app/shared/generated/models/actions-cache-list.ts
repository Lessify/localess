/* tslint:disable */
/* eslint-disable */

/**
 * Repository actions caches
 */
export interface ActionsCacheList {

  /**
   * Array of caches
   */
  actions_caches: Array<{
'id'?: number;
'ref'?: string;
'key'?: string;
'version'?: string;
'last_accessed_at'?: string;
'created_at'?: string;
'size_in_bytes'?: number;
}>;

  /**
   * Total number of caches
   */
  total_count: number;
}
