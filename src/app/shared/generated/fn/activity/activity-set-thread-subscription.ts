/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { ThreadSubscription } from '../../models/thread-subscription';

export interface ActivitySetThreadSubscription$Params {

/**
 * The unique identifier of the notification thread. This corresponds to the value returned in the `id` field when you retrieve notifications (for example with the [`GET /notifications` operation](https://docs.github.com/rest/activity/notifications#list-notifications-for-the-authenticated-user)).
 */
  thread_id: number;
      body?: {

/**
 * Whether to block all notifications from a thread.
 */
'ignored'?: boolean;
}
}

export function activitySetThreadSubscription(http: HttpClient, rootUrl: string, params: ActivitySetThreadSubscription$Params, context?: HttpContext): Observable<StrictHttpResponse<ThreadSubscription>> {
  const rb = new RequestBuilder(rootUrl, activitySetThreadSubscription.PATH, 'put');
  if (params) {
    rb.path('thread_id', params.thread_id, {});
    rb.body(params.body, 'application/json');
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<ThreadSubscription>;
    })
  );
}

activitySetThreadSubscription.PATH = '/notifications/threads/{thread_id}/subscription';
