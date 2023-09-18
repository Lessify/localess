/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Event } from '../../models/event';

export interface ActivityListOrgEventsForAuthenticatedUser$Params {

/**
 * The handle for the GitHub user account.
 */
  username: string;

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
}

export function activityListOrgEventsForAuthenticatedUser(http: HttpClient, rootUrl: string, params: ActivityListOrgEventsForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Event>>> {
  const rb = new RequestBuilder(rootUrl, activityListOrgEventsForAuthenticatedUser.PATH, 'get');
  if (params) {
    rb.path('username', params.username, {});
    rb.path('org', params.org, {});
    rb.query('per_page', params.per_page, {});
    rb.query('page', params.page, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Array<Event>>;
    })
  );
}

activityListOrgEventsForAuthenticatedUser.PATH = '/users/{username}/events/orgs/{org}';
