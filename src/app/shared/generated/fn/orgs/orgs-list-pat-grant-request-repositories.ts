/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { MinimalRepository } from '../../models/minimal-repository';

export interface OrgsListPatGrantRequestRepositories$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;

/**
 * Unique identifier of the request for access via fine-grained personal access token.
 */
  pat_request_id: number;

/**
 * The number of results per page (max 100).
 */
  per_page?: number;

/**
 * Page number of the results to fetch.
 */
  page?: number;
}

export function orgsListPatGrantRequestRepositories(http: HttpClient, rootUrl: string, params: OrgsListPatGrantRequestRepositories$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<MinimalRepository>>> {
  const rb = new RequestBuilder(rootUrl, orgsListPatGrantRequestRepositories.PATH, 'get');
  if (params) {
    rb.path('org', params.org, {});
    rb.path('pat_request_id', params.pat_request_id, {});
    rb.query('per_page', params.per_page, {});
    rb.query('page', params.page, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Array<MinimalRepository>>;
    })
  );
}

orgsListPatGrantRequestRepositories.PATH = '/orgs/{org}/personal-access-token-requests/{pat_request_id}/repositories';
