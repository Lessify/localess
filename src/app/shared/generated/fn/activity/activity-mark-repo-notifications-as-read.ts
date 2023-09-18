/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';


export interface ActivityMarkRepoNotificationsAsRead$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;
      body?: {

/**
 * Describes the last point that notifications were checked. Anything updated since this time will not be marked as read. If you omit this parameter, all notifications are marked as read. This is a timestamp in [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) format: `YYYY-MM-DDTHH:MM:SSZ`. Default: The current timestamp.
 */
'last_read_at'?: string;
}
}

export function activityMarkRepoNotificationsAsRead(http: HttpClient, rootUrl: string, params: ActivityMarkRepoNotificationsAsRead$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'message'?: string;
'url'?: string;
}>> {
  const rb = new RequestBuilder(rootUrl, activityMarkRepoNotificationsAsRead.PATH, 'put');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.body(params.body, 'application/json');
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<{
      'message'?: string;
      'url'?: string;
      }>;
    })
  );
}

activityMarkRepoNotificationsAsRead.PATH = '/repos/{owner}/{repo}/notifications';
