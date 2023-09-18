/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { MinimalRepository } from '../../models/minimal-repository';

export interface ReposListForUser$Params {

/**
 * The handle for the GitHub user account.
 */
  username: string;

/**
 * Limit results to repositories of the specified type.
 */
  type?: 'all' | 'owner' | 'member';

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
}

export function reposListForUser(http: HttpClient, rootUrl: string, params: ReposListForUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<MinimalRepository>>> {
  const rb = new RequestBuilder(rootUrl, reposListForUser.PATH, 'get');
  if (params) {
    rb.path('username', params.username, {});
    rb.query('type', params.type, {});
    rb.query('sort', params.sort, {});
    rb.query('direction', params.direction, {});
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

reposListForUser.PATH = '/users/{username}/repos';
