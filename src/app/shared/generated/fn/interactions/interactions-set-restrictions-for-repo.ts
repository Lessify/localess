/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { InteractionLimit } from '../../models/interaction-limit';
import { InteractionLimitResponse } from '../../models/interaction-limit-response';

export interface InteractionsSetRestrictionsForRepo$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;
      body: InteractionLimit
}

export function interactionsSetRestrictionsForRepo(http: HttpClient, rootUrl: string, params: InteractionsSetRestrictionsForRepo$Params, context?: HttpContext): Observable<StrictHttpResponse<InteractionLimitResponse>> {
  const rb = new RequestBuilder(rootUrl, interactionsSetRestrictionsForRepo.PATH, 'put');
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
      return r as StrictHttpResponse<InteractionLimitResponse>;
    })
  );
}

interactionsSetRestrictionsForRepo.PATH = '/repos/{owner}/{repo}/interaction-limits';
