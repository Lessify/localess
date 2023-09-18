/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Integration } from '../../models/integration';

export interface ReposGetAppsWithAccessToProtectedBranch$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

/**
 * The name of the branch. Cannot contain wildcard characters. To use wildcard characters in branch names, use [the GraphQL API](https://docs.github.com/graphql).
 */
  branch: string;
}

export function reposGetAppsWithAccessToProtectedBranch(http: HttpClient, rootUrl: string, params: ReposGetAppsWithAccessToProtectedBranch$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Integration>>> {
  const rb = new RequestBuilder(rootUrl, reposGetAppsWithAccessToProtectedBranch.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('branch', params.branch, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Array<Integration>>;
    })
  );
}

reposGetAppsWithAccessToProtectedBranch.PATH = '/repos/{owner}/{repo}/branches/{branch}/protection/restrictions/apps';
