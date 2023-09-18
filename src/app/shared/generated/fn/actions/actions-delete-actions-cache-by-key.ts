/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { ActionsCacheList } from '../../models/actions-cache-list';

export interface ActionsDeleteActionsCacheByKey$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

/**
 * A key for identifying the cache.
 */
  key: string;

/**
 * The full Git reference for narrowing down the cache. The `ref` for a branch should be formatted as `refs/heads/<branch name>`. To reference a pull request use `refs/pull/<number>/merge`.
 */
  ref?: string;
}

export function actionsDeleteActionsCacheByKey(http: HttpClient, rootUrl: string, params: ActionsDeleteActionsCacheByKey$Params, context?: HttpContext): Observable<StrictHttpResponse<ActionsCacheList>> {
  const rb = new RequestBuilder(rootUrl, actionsDeleteActionsCacheByKey.PATH, 'delete');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.query('key', params.key, {});
    rb.query('ref', params.ref, {});
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

actionsDeleteActionsCacheByKey.PATH = '/repos/{owner}/{repo}/actions/caches';
