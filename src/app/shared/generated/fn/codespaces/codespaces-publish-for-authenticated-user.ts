/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { CodespaceWithFullRepository } from '../../models/codespace-with-full-repository';

export interface CodespacesPublishForAuthenticatedUser$Params {

/**
 * The name of the codespace.
 */
  codespace_name: string;
      body: {

/**
 * A name for the new repository.
 */
'name'?: string;

/**
 * Whether the new repository should be private.
 */
'private'?: boolean;
}
}

export function codespacesPublishForAuthenticatedUser(http: HttpClient, rootUrl: string, params: CodespacesPublishForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<CodespaceWithFullRepository>> {
  const rb = new RequestBuilder(rootUrl, codespacesPublishForAuthenticatedUser.PATH, 'post');
  if (params) {
    rb.path('codespace_name', params.codespace_name, {});
    rb.body(params.body, 'application/json');
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<CodespaceWithFullRepository>;
    })
  );
}

codespacesPublishForAuthenticatedUser.PATH = '/user/codespaces/{codespace_name}/publish';
