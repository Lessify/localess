/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { EmptyObject } from '../../models/empty-object';

export interface ActionsCreateOrUpdateOrgSecret$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;

/**
 * The name of the secret.
 */
  secret_name: string;
      body: {

/**
 * Value for your secret, encrypted with [LibSodium](https://libsodium.gitbook.io/doc/bindings_for_other_languages) using the public key retrieved from the [Get an organization public key](https://docs.github.com/rest/actions/secrets#get-an-organization-public-key) endpoint.
 */
'encrypted_value'?: string;

/**
 * ID of the key you used to encrypt the secret.
 */
'key_id'?: string;

/**
 * Which type of organization repositories have access to the organization secret. `selected` means only the repositories specified by `selected_repository_ids` can access the secret.
 */
'visibility': 'all' | 'private' | 'selected';

/**
 * An array of repository ids that can access the organization secret. You can only provide a list of repository ids when the `visibility` is set to `selected`. You can manage the list of selected repositories using the [List selected repositories for an organization secret](https://docs.github.com/rest/actions/secrets#list-selected-repositories-for-an-organization-secret), [Set selected repositories for an organization secret](https://docs.github.com/rest/actions/secrets#set-selected-repositories-for-an-organization-secret), and [Remove selected repository from an organization secret](https://docs.github.com/rest/actions/secrets#remove-selected-repository-from-an-organization-secret) endpoints.
 */
'selected_repository_ids'?: Array<number>;
}
}

export function actionsCreateOrUpdateOrgSecret(http: HttpClient, rootUrl: string, params: ActionsCreateOrUpdateOrgSecret$Params, context?: HttpContext): Observable<StrictHttpResponse<EmptyObject>> {
  const rb = new RequestBuilder(rootUrl, actionsCreateOrUpdateOrgSecret.PATH, 'put');
  if (params) {
    rb.path('org', params.org, {});
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

actionsCreateOrUpdateOrgSecret.PATH = '/orgs/{org}/actions/secrets/{secret_name}';
