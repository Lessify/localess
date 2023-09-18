/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { MinimalRepository } from '../../models/minimal-repository';

export interface CodespacesListRepositoriesForSecretForAuthenticatedUser$Params {

/**
 * The name of the secret.
 */
  secret_name: string;
}

export function codespacesListRepositoriesForSecretForAuthenticatedUser(http: HttpClient, rootUrl: string, params: CodespacesListRepositoriesForSecretForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'repositories': Array<MinimalRepository>;
}>> {
  const rb = new RequestBuilder(rootUrl, codespacesListRepositoriesForSecretForAuthenticatedUser.PATH, 'get');
  if (params) {
    rb.path('secret_name', params.secret_name, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<{
      'total_count': number;
      'repositories': Array<MinimalRepository>;
      }>;
    })
  );
}

codespacesListRepositoriesForSecretForAuthenticatedUser.PATH = '/user/codespaces/secrets/{secret_name}/repositories';
