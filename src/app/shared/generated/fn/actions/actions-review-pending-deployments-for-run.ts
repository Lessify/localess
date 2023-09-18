/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Deployment } from '../../models/deployment';

export interface ActionsReviewPendingDeploymentsForRun$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

/**
 * The unique identifier of the workflow run.
 */
  run_id: number;
      body: {

/**
 * The list of environment ids to approve or reject
 */
'environment_ids': Array<number>;

/**
 * Whether to approve or reject deployment to the specified environments.
 */
'state': 'approved' | 'rejected';

/**
 * A comment to accompany the deployment review
 */
'comment': string;
}
}

export function actionsReviewPendingDeploymentsForRun(http: HttpClient, rootUrl: string, params: ActionsReviewPendingDeploymentsForRun$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Deployment>>> {
  const rb = new RequestBuilder(rootUrl, actionsReviewPendingDeploymentsForRun.PATH, 'post');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('run_id', params.run_id, {});
    rb.body(params.body, 'application/json');
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Array<Deployment>>;
    })
  );
}

actionsReviewPendingDeploymentsForRun.PATH = '/repos/{owner}/{repo}/actions/runs/{run_id}/pending_deployments';
