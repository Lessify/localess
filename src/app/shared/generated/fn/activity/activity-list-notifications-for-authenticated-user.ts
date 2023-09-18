/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Thread } from '../../models/thread';

export interface ActivityListNotificationsForAuthenticatedUser$Params {

/**
 * If `true`, show notifications marked as read.
 */
  all?: boolean;

/**
 * If `true`, only shows notifications in which the user is directly participating or mentioned.
 */
  participating?: boolean;

/**
 * Only show results that were last updated after the given time. This is a timestamp in [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) format: `YYYY-MM-DDTHH:MM:SSZ`.
 */
  since?: string;

/**
 * Only show notifications updated before the given time. This is a timestamp in [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) format: `YYYY-MM-DDTHH:MM:SSZ`.
 */
  before?: string;

/**
 * Page number of the results to fetch.
 */
  page?: number;

/**
 * The number of results per page (max 50).
 */
  per_page?: number;
}

export function activityListNotificationsForAuthenticatedUser(http: HttpClient, rootUrl: string, params?: ActivityListNotificationsForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Thread>>> {
  const rb = new RequestBuilder(rootUrl, activityListNotificationsForAuthenticatedUser.PATH, 'get');
  if (params) {
    rb.query('all', params.all, {});
    rb.query('participating', params.participating, {});
    rb.query('since', params.since, {});
    rb.query('before', params.before, {});
    rb.query('page', params.page, {});
    rb.query('per_page', params.per_page, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Array<Thread>>;
    })
  );
}

activityListNotificationsForAuthenticatedUser.PATH = '/notifications';
