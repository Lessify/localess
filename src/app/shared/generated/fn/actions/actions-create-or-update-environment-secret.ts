/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { EmptyObject } from '../../models/empty-object';

export interface ActionsCreateOrUpdateEnvironmentSecret$Params {

/**
 * The unique identifier of the repository.
 */
  repository_id: number;

/**
 * The name of the environment.
 */
  environment_name: string;

/**
 * The name of the secret.
 */
  secret_name: string;
      body: {

/**
 * Value for your secret, encrypted with [LibSodium](https://libsodium.gitbook.io/doc/bindings_for_other_languages) using the public key retrieved from the [Get an environment public key](https://docs.github.com/rest/actions/secrets#get-an-environment-public-key) endpoint.
 */
'encrypted_value': string;

/**
 * ID of the key you used to encrypt the secret.
 */
'key_id': string;
}
}

export function actionsCreateOrUpdateEnvironmentSecret(http: HttpClient, rootUrl: string, params: ActionsCreateOrUpdateEnvironmentSecret$Params, context?: HttpContext): Observable<StrictHttpResponse<EmptyObject>> {
  const rb = new RequestBuilder(rootUrl, actionsCreateOrUpdateEnvironmentSecret.PATH, 'put');
  if (params) {
    rb.path('repository_id', params.repository_id, {});
    rb.path('environment_name', params.environment_name, {});
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

actionsCreateOrUpdateEnvironmentSecret.PATH = '/repositories/{repository_id}/environments/{environment_name}/secrets/{secret_name}';
