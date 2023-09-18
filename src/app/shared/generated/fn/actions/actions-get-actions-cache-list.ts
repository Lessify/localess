/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { ActionsCacheList } from '../../models/actions-cache-list';

export interface ActionsGetActionsCacheList$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

/**
 * The number of results per page (max 100).
 */
  per_page?: number;

/**
 * Page number of the results to fetch.
 */
  page?: number;

/**
 * The full Git reference for narrowing down the cache. The `ref` for a branch should be formatted as `refs/heads/<branch name>`. To reference a pull request use `refs/pull/<number>/merge`.
 */
  ref?: string;

/**
 * An explicit key or prefix for identifying the cache
 */
  key?: string;

/**
 * The property to sort the results by. `created_at` means when the cache was created. `last_accessed_at` means when the cache was last accessed. `size_in_bytes` is the size of the cache in bytes.
 */
  sort?: 'created_at' | 'last_accessed_at' | 'size_in_bytes';

/**
 * The direction to sort the results by.
 */
  direction?: 'asc' | 'desc';
}

export function actionsGetActionsCacheList(http: HttpClient, rootUrl: string, params: ActionsGetActionsCacheList$Params, context?: HttpContext): Observable<StrictHttpResponse<ActionsCacheList>> {
  const rb = new RequestBuilder(rootUrl, actionsGetActionsCacheList.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.query('per_page', params.per_page, {});
    rb.query('page', params.page, {});
    rb.query('ref', params.ref, {});
    rb.query('key', params.key, {});
    rb.query('sort', params.sort, {});
    rb.query('direction', params.direction, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<ActionsCacheList>;
    })
  );
}

actionsGetActionsCacheList.PATH = '/repos/{owner}/{repo}/actions/caches';
