/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Codespace } from '../../models/codespace';

export interface CodespacesUpdateForAuthenticatedUser$Params {

/**
 * The name of the codespace.
 */
  codespace_name: string;
      body?: {

/**
 * A valid machine to transition this codespace to.
 */
'machine'?: string;

/**
 * Display name for this codespace
 */
'display_name'?: string;

/**
 * Recently opened folders inside the codespace. It is currently used by the clients to determine the folder path to load the codespace in.
 */
'recent_folders'?: Array<string>;
}
}

export function codespacesUpdateForAuthenticatedUser(http: HttpClient, rootUrl: string, params: CodespacesUpdateForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Codespace>> {
  const rb = new RequestBuilder(rootUrl, codespacesUpdateForAuthenticatedUser.PATH, 'patch');
  if (params) {
    rb.path('codespace_name', params.codespace_name, {});
    rb.body(params.body, 'application/json');
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Codespace>;
    })
  );
}

codespacesUpdateForAuthenticatedUser.PATH = '/user/codespaces/{codespace_name}';
