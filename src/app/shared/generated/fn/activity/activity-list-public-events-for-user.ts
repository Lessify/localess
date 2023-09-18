/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Event } from '../../models/event';

export interface ActivityListPublicEventsForUser$Params {

/**
 * The handle for the GitHub user account.
 */
  username: string;

/**
 * The number of results per page (max 100).
 */
  per_page?: number;

/**
 * Page number of the results to fetch.
 */
  page?: number;
}

export function activityListPublicEventsForUser(http: HttpClient, rootUrl: string, params: ActivityListPublicEventsForUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Event>>> {
  const rb = new RequestBuilder(rootUrl, activityListPublicEventsForUser.PATH, 'get');
  if (params) {
    rb.path('username', params.username, {});
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

activityListPublicEventsForUser.PATH = '/users/{username}/events/public';
