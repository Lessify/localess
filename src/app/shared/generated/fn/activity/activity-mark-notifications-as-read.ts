/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';


export interface ActivityMarkNotificationsAsRead$Params {
      body?: {

/**
 * Describes the last point that notifications were checked. Anything updated since this time will not be marked as read. If you omit this parameter, all notifications are marked as read. This is a timestamp in [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) format: `YYYY-MM-DDTHH:MM:SSZ`. Default: The current timestamp.
 */
'last_read_at'?: string;

/**
 * Whether the notification has been read.
 */
'read'?: boolean;
}
}

export function activityMarkNotificationsAsRead(http: HttpClient, rootUrl: string, params?: ActivityMarkNotificationsAsRead$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'message'?: string;
}>> {
  const rb = new RequestBuilder(rootUrl, activityMarkNotificationsAsRead.PATH, 'put');
  if (params) {
    rb.body(params.body, 'application/json');
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<{
      'message'?: string;
      }>;
    })
  );
}

activityMarkNotificationsAsRead.PATH = '/notifications';
