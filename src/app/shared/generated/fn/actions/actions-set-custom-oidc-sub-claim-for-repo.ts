/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { EmptyObject } from '../../models/empty-object';

export interface ActionsSetCustomOidcSubClaimForRepo$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;
      body: {

/**
 * Whether to use the default template or not. If `true`, the `include_claim_keys` field is ignored.
 */
'use_default': boolean;

/**
 * Array of unique strings. Each claim key can only contain alphanumeric characters and underscores.
 */
'include_claim_keys'?: Array<string>;
}
}

export function actionsSetCustomOidcSubClaimForRepo(http: HttpClient, rootUrl: string, params: ActionsSetCustomOidcSubClaimForRepo$Params, context?: HttpContext): Observable<StrictHttpResponse<EmptyObject>> {
  const rb = new RequestBuilder(rootUrl, actionsSetCustomOidcSubClaimForRepo.PATH, 'put');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
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

actionsSetCustomOidcSubClaimForRepo.PATH = '/repos/{owner}/{repo}/actions/oidc/customization/sub';
