/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { ActionsPublicKey } from '../../models/actions-public-key';

export interface ActionsGetRepoPublicKey$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;
}

export function actionsGetRepoPublicKey(http: HttpClient, rootUrl: string, params: ActionsGetRepoPublicKey$Params, context?: HttpContext): Observable<StrictHttpResponse<ActionsPublicKey>> {
  const rb = new RequestBuilder(rootUrl, actionsGetRepoPublicKey.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<ActionsPublicKey>;
    })
  );
}

actionsGetRepoPublicKey.PATH = '/repos/{owner}/{repo}/actions/secrets/public-key';
