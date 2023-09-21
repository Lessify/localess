/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Runner } from '../../models/runner';

export interface ActionsListSelfHostedRunnersForRepo$Params {

/**
 * The name of a self-hosted runner.
 */
  name?: string;

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
}

export function actionsListSelfHostedRunnersForRepo(http: HttpClient, rootUrl: string, params: ActionsListSelfHostedRunnersForRepo$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'runners': Array<Runner>;
}>> {
  const rb = new RequestBuilder(rootUrl, actionsListSelfHostedRunnersForRepo.PATH, 'get');
  if (params) {
    rb.query('name', params.name, {});
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.query('per_page', params.per_page, {});
    rb.query('page', params.page, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<{
      'total_count': number;
      'runners': Array<Runner>;
      }>;
    })
  );
}

actionsListSelfHostedRunnersForRepo.PATH = '/repos/{owner}/{repo}/actions/runners';