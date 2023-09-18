/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Feed } from '../../models/feed';

export interface ActivityGetFeeds$Params {
}

export function activityGetFeeds(http: HttpClient, rootUrl: string, params?: ActivityGetFeeds$Params, context?: HttpContext): Observable<StrictHttpResponse<Feed>> {
  const rb = new RequestBuilder(rootUrl, activityGetFeeds.PATH, 'get');
  if (params) {
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Feed>;
    })
  );
}

activityGetFeeds.PATH = '/feeds';
