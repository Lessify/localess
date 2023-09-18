/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { EmptyObject } from '../../models/empty-object';

export interface ActionsCreateOrgVariable$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;
      body: {

/**
 * The name of the variable.
 */
'name': string;

/**
 * The value of the variable.
 */
'value': string;

/**
 * The type of repositories in the organization that can access the variable. `selected` means only the repositories specified by `selected_repository_ids` can access the variable.
 */
'visibility': 'all' | 'private' | 'selected';

/**
 * An array of repository ids that can access the organization variable. You can only provide a list of repository ids when the `visibility` is set to `selected`.
 */
'selected_repository_ids'?: Array<number>;
}
}

export function actionsCreateOrgVariable(http: HttpClient, rootUrl: string, params: ActionsCreateOrgVariable$Params, context?: HttpContext): Observable<StrictHttpResponse<EmptyObject>> {
  const rb = new RequestBuilder(rootUrl, actionsCreateOrgVariable.PATH, 'post');
  if (params) {
    rb.path('org', params.org, {});
    rb.body(params.body, 'application/json');
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<EmptyObject>;
    })
  );
}

actionsCreateOrgVariable.PATH = '/orgs/{org}/actions/variables';
