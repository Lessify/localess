/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { RunnerApplication } from '../../models/runner-application';

export interface ActionsListRunnerApplicationsForRepo$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;
}

export function actionsListRunnerApplicationsForRepo(http: HttpClient, rootUrl: string, params: ActionsListRunnerApplicationsForRepo$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<RunnerApplication>>> {
  const rb = new RequestBuilder(rootUrl, actionsListRunnerApplicationsForRepo.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Array<RunnerApplication>>;
    })
  );
}

actionsListRunnerApplicationsForRepo.PATH = '/repos/{owner}/{repo}/actions/runners/downloads';
