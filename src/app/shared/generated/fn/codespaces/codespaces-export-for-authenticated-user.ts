/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { CodespaceExportDetails } from '../../models/codespace-export-details';

export interface CodespacesExportForAuthenticatedUser$Params {

/**
 * The name of the codespace.
 */
  codespace_name: string;
}

export function codespacesExportForAuthenticatedUser(http: HttpClient, rootUrl: string, params: CodespacesExportForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<CodespaceExportDetails>> {
  const rb = new RequestBuilder(rootUrl, codespacesExportForAuthenticatedUser.PATH, 'post');
  if (params) {
    rb.path('codespace_name', params.codespace_name, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<CodespaceExportDetails>;
    })
  );
}

codespacesExportForAuthenticatedUser.PATH = '/user/codespaces/{codespace_name}/exports';
