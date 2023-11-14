/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Repository } from '../../models/repository';

export interface ReposListForAuthenticatedUser$Params {

/**
 * Limit results to repositories with the specified visibility.
 */
  visibility?: 'all' | 'public' | 'private';

/**
 * Comma-separated list of values. Can include:  
 *  * `owner`: Repositories that are owned by the authenticated user.  
 *  * `collaborator`: Repositories that the user has been added to as a collaborator.  
 *  * `organization_member`: Repositories that the user has access to through being a member of an organization. This includes every repository on every team that the user is on.
 */
  affiliation?: string;

/**
 * Limit results to repositories of the specified type. Will cause a `422` error if used in the same request as **visibility** or **affiliation**.
 */
  type?: 'all' | 'owner' | 'public' | 'private' | 'member';

/**
 * The property to sort the results by.
 */
  sort?: 'created' | 'updated' | 'pushed' | 'full_name';

/**
 * The order to sort by. Default: `asc` when using `full_name`, otherwise `desc`.
 */
  direction?: 'asc' | 'desc';

/**
 * The number of results per page (max 100).
 */
  per_page?: number;

/**
 * Page number of the results to fetch.
 */
  page?: number;

/**
 * Only show repositories updated after the given time. This is a timestamp in [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) format: `YYYY-MM-DDTHH:MM:SSZ`.
 */
  since?: string;

/**
 * Only show repositories updated before the given time. This is a timestamp in [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) format: `YYYY-MM-DDTHH:MM:SSZ`.
 */
  before?: string;
}

export function reposListForAuthenticatedUser(http: HttpClient, rootUrl: string, params?: ReposListForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Repository>>> {
  const rb = new RequestBuilder(rootUrl, reposListForAuthenticatedUser.PATH, 'get');
  if (params) {
    rb.query('visibility', params.visibility, {});
    rb.query('affiliation', params.affiliation, {});
    rb.query('type', params.type, {});
    rb.query('sort', params.sort, {});
    rb.query('direction', params.direction, {});
    rb.query('per_page', params.per_page, {});
    rb.query('page', params.page, {});
    rb.query('since', params.since, {});
    rb.query('before', params.before, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Array<Repository>>;
    })
  );
}

reposListForAuthenticatedUser.PATH = '/user/repos';
