/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Thread } from '../../models/thread';

export interface ActivityListRepoNotificationsForAuthenticatedUser$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

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
 * The number of results per page (max 100).
 */
  per_page?: number;

/**
 * Page number of the results to fetch.
 */
  page?: number;
}

export function activityListRepoNotificationsForAuthenticatedUser(http: HttpClient, rootUrl: string, params: ActivityListRepoNotificationsForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Thread>>> {
  const rb = new RequestBuilder(rootUrl, activityListRepoNotificationsForAuthenticatedUser.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.query('all', params.all, {});
    rb.query('participating', params.participating, {});
    rb.query('since', params.since, {});
    rb.query('before', params.before, {});
    rb.query('per_page', params.per_page, {});
    rb.query('page', params.page, {});
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

activityListRepoNotificationsForAuthenticatedUser.PATH = '/repos/{owner}/{repo}/notifications';
