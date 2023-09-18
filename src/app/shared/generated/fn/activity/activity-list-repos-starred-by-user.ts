/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Repository } from '../../models/repository';
import { StarredRepository } from '../../models/starred-repository';

export interface ActivityListReposStarredByUser$Params {

/**
 * The handle for the GitHub user account.
 */
  username: string;

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

export function activityListReposStarredByUser(http: HttpClient, rootUrl: string, params: ActivityListReposStarredByUser$Params, context?: HttpContext): Observable<StrictHttpResponse<(Array<StarredRepository> | Array<Repository>)>> {
  const rb = new RequestBuilder(rootUrl, activityListReposStarredByUser.PATH, 'get');
  if (params) {
    rb.path('username', params.username, {});
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
      return r as StrictHttpResponse<(Array<StarredRepository> | Array<Repository>)>;
    })
  );
}

activityListReposStarredByUser.PATH = '/users/{username}/starred';
