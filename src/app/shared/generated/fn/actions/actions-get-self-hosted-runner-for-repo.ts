/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Runner } from '../../models/runner';

export interface ActionsGetSelfHostedRunnerForRepo$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

/**
 * Unique identifier of the self-hosted runner.
 */
  runner_id: number;
}

export function actionsGetSelfHostedRunnerForRepo(http: HttpClient, rootUrl: string, params: ActionsGetSelfHostedRunnerForRepo$Params, context?: HttpContext): Observable<StrictHttpResponse<Runner>> {
  const rb = new RequestBuilder(rootUrl, actionsGetSelfHostedRunnerForRepo.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('runner_id', params.runner_id, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Runner>;
    })
  );
}

actionsGetSelfHostedRunnerForRepo.PATH = '/repos/{owner}/{repo}/actions/runners/{runner_id}';
