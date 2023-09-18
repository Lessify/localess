/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { SimpleUser } from '../../models/simple-user';

export interface UsersList$Params {

/**
 * A user ID. Only return users with an ID greater than this ID.
 */
  since?: number;

/**
 * The number of results per page (max 100).
 */
  per_page?: number;
}

export function usersList(http: HttpClient, rootUrl: string, params?: UsersList$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<SimpleUser>>> {
  const rb = new RequestBuilder(rootUrl, usersList.PATH, 'get');
  if (params) {
    rb.query('since', params.since, {});
    rb.query('per_page', params.per_page, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Array<SimpleUser>>;
    })
  );
}

usersList.PATH = '/users';
