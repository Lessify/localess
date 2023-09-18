/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { CheckAnnotation } from '../../models/check-annotation';

export interface ChecksListAnnotations$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

/**
 * The unique identifier of the check run.
 */
  check_run_id: number;

/**
 * The number of results per page (max 100).
 */
  per_page?: number;

/**
 * Page number of the results to fetch.
 */
  page?: number;
}

export function checksListAnnotations(http: HttpClient, rootUrl: string, params: ChecksListAnnotations$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<CheckAnnotation>>> {
  const rb = new RequestBuilder(rootUrl, checksListAnnotations.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('check_run_id', params.check_run_id, {});
    rb.query('per_page', params.per_page, {});
    rb.query('page', params.page, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Array<CheckAnnotation>>;
    })
  );
}

checksListAnnotations.PATH = '/repos/{owner}/{repo}/check-runs/{check_run_id}/annotations';
