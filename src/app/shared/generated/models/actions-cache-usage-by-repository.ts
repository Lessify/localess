/* tslint:disable */
/* eslint-disable */

/**
 * GitHub Actions Cache Usage by repository.
 */
export interface ActionsCacheUsageByRepository {

  /**
   * The number of active caches in the repository.
   */
  active_caches_count: number;

  /**
   * The sum of the size in bytes of all the active cache items in the repository.
   */
  active_caches_size_in_bytes: number;

  /**
   * The repository owner and name for the cache usage being shown.
   */
  full_name: string;
}
