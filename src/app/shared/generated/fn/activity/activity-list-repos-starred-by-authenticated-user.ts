/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { StarredRepository } from '../../models/starred-repository';

export interface ActivityListReposStarredByAuthenticatedUser$Params {

/**
 * The property to sort the results by. `created` means when the repository was starred. `updated` means when the repository was last pushed to.
 */
  sort?: 'created' | 'updated';

/**
 * The direction to sort the results by.
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

export function activityListReposStarredByAuthenticatedUser(http: HttpClient, rootUrl: string, params?: ActivityListReposStarredByAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<StarredRepository>>> {
  const rb = new RequestBuilder(rootUrl, activityListReposStarredByAuthenticatedUser.PATH, 'get');
  if (params) {
    rb.query('sort', params.sort, {});
    rb.query('direction', params.direction, {});
    rb.query('per_page', params.per_page, {});
    rb.query('page', params.page, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/vnd.github.v3.star+json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Array<StarredRepository>>;
    })
  );
}

activityListReposStarredByAuthenticatedUser.PATH = '/user/starred';
