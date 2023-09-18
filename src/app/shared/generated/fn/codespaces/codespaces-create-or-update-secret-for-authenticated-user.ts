/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { EmptyObject } from '../../models/empty-object';

export interface CodespacesCreateOrUpdateSecretForAuthenticatedUser$Params {

/**
 * The name of the secret.
 */
  secret_name: string;
      body: {

/**
 * Value for your secret, encrypted with [LibSodium](https://libsodium.gitbook.io/doc/bindings_for_other_languages) using the public key retrieved from the [Get the public key for the authenticated user](https://docs.github.com/rest/codespaces/secrets#get-public-key-for-the-authenticated-user) endpoint.
 */
'encrypted_value'?: string;

/**
 * ID of the key you used to encrypt the secret.
 */
'key_id': string;

/**
 * An array of repository ids that can access the user secret. You can manage the list of selected repositories using the [List selected repositories for a user secret](https://docs.github.com/rest/codespaces/secrets#list-selected-repositories-for-a-user-secret), [Set selected repositories for a user secret](https://docs.github.com/rest/codespaces/secrets#set-selected-repositories-for-a-user-secret), and [Remove a selected repository from a user secret](https://docs.github.com/rest/codespaces/secrets#remove-a-selected-repository-from-a-user-secret) endpoints.
 */
'selected_repository_ids'?: Array<(number | string)>;
}
}

export function codespacesCreateOrUpdateSecretForAuthenticatedUser(http: HttpClient, rootUrl: string, params: CodespacesCreateOrUpdateSecretForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<EmptyObject>> {
  const rb = new RequestBuilder(rootUrl, codespacesCreateOrUpdateSecretForAuthenticatedUser.PATH, 'put');
  if (params) {
    rb.path('secret_name', params.secret_name, {});
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

codespacesCreateOrUpdateSecretForAuthenticatedUser.PATH = '/user/codespaces/secrets/{secret_name}';
