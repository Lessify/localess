/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { CodespaceMachine } from '../../models/codespace-machine';

export interface CodespacesCodespaceMachinesForAuthenticatedUser$Params {

/**
 * The name of the codespace.
 */
  codespace_name: string;
}

export function codespacesCodespaceMachinesForAuthenticatedUser(http: HttpClient, rootUrl: string, params: CodespacesCodespaceMachinesForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'machines': Array<CodespaceMachine>;
}>> {
  const rb = new RequestBuilder(rootUrl, codespacesCodespaceMachinesForAuthenticatedUser.PATH, 'get');
  if (params) {
    rb.path('codespace_name', params.codespace_name, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<{
      'total_count': number;
      'machines': Array<CodespaceMachine>;
      }>;
    })
  );
}

codespacesCodespaceMachinesForAuthenticatedUser.PATH = '/user/codespaces/{codespace_name}/machines';
