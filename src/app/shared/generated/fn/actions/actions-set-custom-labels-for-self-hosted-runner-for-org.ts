/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { RunnerLabel } from '../../models/runner-label';

export interface ActionsSetCustomLabelsForSelfHostedRunnerForOrg$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;

/**
 * Unique identifier of the self-hosted runner.
 */
  runner_id: number;
      body: {

/**
 * The names of the custom labels to set for the runner. You can pass an empty array to remove all custom labels.
 */
'labels': Array<string>;
}
}

export function actionsSetCustomLabelsForSelfHostedRunnerForOrg(http: HttpClient, rootUrl: string, params: ActionsSetCustomLabelsForSelfHostedRunnerForOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'labels': Array<RunnerLabel>;
}>> {
  const rb = new RequestBuilder(rootUrl, actionsSetCustomLabelsForSelfHostedRunnerForOrg.PATH, 'put');
  if (params) {
    rb.path('org', params.org, {});
    rb.path('runner_id', params.runner_id, {});
    rb.body(params.body, 'application/json');
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<{
      'total_count': number;
      'labels': Array<RunnerLabel>;
      }>;
    })
  );
}

actionsSetCustomLabelsForSelfHostedRunnerForOrg.PATH = '/orgs/{org}/actions/runners/{runner_id}/labels';
