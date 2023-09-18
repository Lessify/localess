/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Hovercard } from '../../models/hovercard';

export interface UsersGetContextForUser$Params {

/**
 * The handle for the GitHub user account.
 */
  username: string;

/**
 * Identifies which additional information you'd like to receive about the person's hovercard. Can be `organization`, `repository`, `issue`, `pull_request`. **Required** when using `subject_id`.
 */
  subject_type?: 'organization' | 'repository' | 'issue' | 'pull_request';

/**
 * Uses the ID for the `subject_type` you specified. **Required** when using `subject_type`.
 */
  subject_id?: string;
}

export function usersGetContextForUser(http: HttpClient, rootUrl: string, params: UsersGetContextForUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Hovercard>> {
  const rb = new RequestBuilder(rootUrl, usersGetContextForUser.PATH, 'get');
  if (params) {
    rb.path('username', params.username, {});
    rb.query('subject_type', params.subject_type, {});
    rb.query('subject_id', params.subject_id, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Hovercard>;
    })
  );
}

usersGetContextForUser.PATH = '/users/{username}/hovercard';
