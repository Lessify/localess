/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { RunnerLabel } from '../../models/runner-label';

export interface ActionsRemoveCustomLabelFromSelfHostedRunnerForOrg$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;

/**
 * Unique identifier of the self-hosted runner.
 */
  runner_id: number;

/**
 * The name of a self-hosted runner's custom label.
 */
  name: string;
}

export function actionsRemoveCustomLabelFromSelfHostedRunnerForOrg(http: HttpClient, rootUrl: string, params: ActionsRemoveCustomLabelFromSelfHostedRunnerForOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'labels': Array<RunnerLabel>;
}>> {
  const rb = new RequestBuilder(rootUrl, actionsRemoveCustomLabelFromSelfHostedRunnerForOrg.PATH, 'delete');
  if (params) {
    rb.path('org', params.org, {});
    rb.path('runner_id', params.runner_id, {});
    rb.path('name', params.name, {});
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

actionsRemoveCustomLabelFromSelfHostedRunnerForOrg.PATH = '/orgs/{org}/actions/runners/{runner_id}/labels/{name}';
