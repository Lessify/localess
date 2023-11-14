/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { DeploymentStatus } from '../../models/deployment-status';

export interface ReposCreateDeploymentStatus$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

/**
 * deployment_id parameter
 */
  deployment_id: number;
      body: {

/**
 * The state of the status. When you set a transient deployment to `inactive`, the deployment will be shown as `destroyed` in GitHub.
 */
'state': 'error' | 'failure' | 'inactive' | 'in_progress' | 'queued' | 'pending' | 'success';

/**
 * The target URL to associate with this status. This URL should contain output to keep the user updated while the task is running or serve as historical information for what happened in the deployment. **Note:** It's recommended to use the `log_url` parameter, which replaces `target_url`.
 */
'target_url'?: string;

/**
 * The full URL of the deployment's output. This parameter replaces `target_url`. We will continue to accept `target_url` to support legacy uses, but we recommend replacing `target_url` with `log_url`. Setting `log_url` will automatically set `target_url` to the same value. Default: `""`
 */
'log_url'?: string;

/**
 * A short description of the status. The maximum description length is 140 characters.
 */
'description'?: string;

/**
 * Name for the target deployment environment, which can be changed when setting a deploy status. For example, `production`, `staging`, or `qa`. If not defined, the environment of the previous status on the deployment will be used, if it exists. Otherwise, the environment of the deployment will be used.
 */
'environment'?: string;

/**
 * Sets the URL for accessing your environment. Default: `""`
 */
'environment_url'?: string;

/**
 * Adds a new `inactive` status to all prior non-transient, non-production environment deployments with the same repository and `environment` name as the created status's deployment. An `inactive` status is only added to deployments that had a `success` state. Default: `true`
 */
'auto_inactive'?: boolean;
}
}

export function reposCreateDeploymentStatus(http: HttpClient, rootUrl: string, params: ReposCreateDeploymentStatus$Params, context?: HttpContext): Observable<StrictHttpResponse<DeploymentStatus>> {
  const rb = new RequestBuilder(rootUrl, reposCreateDeploymentStatus.PATH, 'post');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('deployment_id', params.deployment_id, {});
    rb.body(params.body, 'application/json');
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<DeploymentStatus>;
    })
  );
}

reposCreateDeploymentStatus.PATH = '/repos/{owner}/{repo}/deployments/{deployment_id}/statuses';
