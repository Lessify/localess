/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { EmptyObject } from '../../models/empty-object';

export interface CodespacesCreateOrUpdateRepoSecret$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

/**
 * The name of the secret.
 */
  secret_name: string;
      body: {

/**
 * Value for your secret, encrypted with [LibSodium](https://libsodium.gitbook.io/doc/bindings_for_other_languages) using the public key retrieved from the [Get a repository public key](https://docs.github.com/rest/codespaces/repository-secrets#get-a-repository-public-key) endpoint.
 */
'encrypted_value'?: string;

/**
 * ID of the key you used to encrypt the secret.
 */
'key_id'?: string;
}
}

export function codespacesCreateOrUpdateRepoSecret(http: HttpClient, rootUrl: string, params: CodespacesCreateOrUpdateRepoSecret$Params, context?: HttpContext): Observable<StrictHttpResponse<EmptyObject>> {
  const rb = new RequestBuilder(rootUrl, codespacesCreateOrUpdateRepoSecret.PATH, 'put');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
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

codespacesCreateOrUpdateRepoSecret.PATH = '/repos/{owner}/{repo}/codespaces/secrets/{secret_name}';
