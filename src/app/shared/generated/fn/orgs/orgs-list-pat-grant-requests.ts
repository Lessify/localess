/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { OrganizationProgrammaticAccessGrantRequest } from '../../models/organization-programmatic-access-grant-request';

export interface OrgsListPatGrantRequests$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;

/**
 * The number of results per page (max 100).
 */
  per_page?: number;

/**
 * Page number of the results to fetch.
 */
  page?: number;

/**
 * The property by which to sort the results.
 */
  sort?: 'created_at';

/**
 * The direction to sort the results by.
 */
  direction?: 'asc' | 'desc';

/**
 * A list of owner usernames to use to filter the results.
 */
  owner?: Array<string>;

/**
 * The name of the repository to use to filter the results.
 */
  repository?: string;

/**
 * The permission to use to filter the results.
 */
  permission?: string;

/**
 * Only show fine-grained personal access tokens used before the given time. This is a timestamp in [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) format: `YYYY-MM-DDTHH:MM:SSZ`.
 */
  last_used_before?: string;

/**
 * Only show fine-grained personal access tokens used after the given time. This is a timestamp in [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) format: `YYYY-MM-DDTHH:MM:SSZ`.
 */
  last_used_after?: string;
}

export function orgsListPatGrantRequests(http: HttpClient, rootUrl: string, params: OrgsListPatGrantRequests$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<OrganizationProgrammaticAccessGrantRequest>>> {
  const rb = new RequestBuilder(rootUrl, orgsListPatGrantRequests.PATH, 'get');
  if (params) {
    rb.path('org', params.org, {});
    rb.query('per_page', params.per_page, {});
    rb.query('page', params.page, {});
    rb.query('sort', params.sort, {});
    rb.query('direction', params.direction, {});
    rb.query('owner', params.owner, {});
    rb.query('repository', params.repository, {});
    rb.query('permission', params.permission, {});
    rb.query('last_used_before', params.last_used_before, {});
    rb.query('last_used_after', params.last_used_after, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Array<OrganizationProgrammaticAccessGrantRequest>>;
    })
  );
}

orgsListPatGrantRequests.PATH = '/orgs/{org}/personal-access-token-requests';
