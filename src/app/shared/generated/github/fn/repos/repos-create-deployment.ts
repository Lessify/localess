/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Deployment } from '../../models/deployment';

export interface ReposCreateDeployment$Params {

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
 * The ref to deploy. This can be a branch, tag, or SHA.
 */
'ref': string;

/**
 * Specifies a task to execute (e.g., `deploy` or `deploy:migrations`).
 */
'task'?: string;

/**
 * Attempts to automatically merge the default branch into the requested ref, if it's behind the default branch.
 */
'auto_merge'?: boolean;

/**
 * The [status](https://docs.github.com/rest/commits/statuses) contexts to verify against commit status checks. If you omit this parameter, GitHub verifies all unique contexts before creating a deployment. To bypass checking entirely, pass an empty array. Defaults to all unique contexts.
 */
'required_contexts'?: Array<string>;
'payload'?: ({
[key: string]: any;
} | string);

/**
 * Name for the target deployment environment (e.g., `production`, `staging`, `qa`).
 */
'environment'?: string;

/**
 * Short description of the deployment.
 */
'description'?: string | null;

/**
 * Specifies if the given environment is specific to the deployment and will no longer exist at some point in the future. Default: `false`
 */
'transient_environment'?: boolean;

/**
 * Specifies if the given environment is one that end-users directly interact with. Default: `true` when `environment` is `production` and `false` otherwise.
 */
'production_environment'?: boolean;
}
}

export function reposCreateDeployment(http: HttpClient, rootUrl: string, params: ReposCreateDeployment$Params, context?: HttpContext): Observable<StrictHttpResponse<Deployment>> {
  const rb = new RequestBuilder(rootUrl, reposCreateDeployment.PATH, 'post');
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
      return r as StrictHttpResponse<Deployment>;
    })
  );
}

reposCreateDeployment.PATH = '/repos/{owner}/{repo}/deployments';
