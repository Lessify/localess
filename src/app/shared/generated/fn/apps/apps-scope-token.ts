/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { AppPermissions } from '../../models/app-permissions';
import { Authorization } from '../../models/authorization';

export interface AppsScopeToken$Params {

/**
 * The client ID of the GitHub app.
 */
  client_id: string;
      body: {

/**
 * The access token used to authenticate to the GitHub API.
 */
'access_token': string;

/**
 * The name of the user or organization to scope the user access token to. **Required** unless `target_id` is specified.
 */
'target'?: string;

/**
 * The ID of the user or organization to scope the user access token to. **Required** unless `target` is specified.
 */
'target_id'?: number;

/**
 * The list of repository names to scope the user access token to. `repositories` may not be specified if `repository_ids` is specified.
 */
'repositories'?: Array<string>;

/**
 * The list of repository IDs to scope the user access token to. `repository_ids` may not be specified if `repositories` is specified.
 */
'repository_ids'?: Array<number>;
'permissions'?: AppPermissions;
}
}

export function appsScopeToken(http: HttpClient, rootUrl: string, params: AppsScopeToken$Params, context?: HttpContext): Observable<StrictHttpResponse<Authorization>> {
  const rb = new RequestBuilder(rootUrl, appsScopeToken.PATH, 'post');
  if (params) {
    rb.path('client_id', params.client_id, {});
    rb.body(params.body, 'application/json');
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Authorization>;
    })
  );
}

appsScopeToken.PATH = '/applications/{client_id}/token/scoped';
