/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { PageDeployment } from '../../models/page-deployment';

export interface ReposCreatePagesDeployment$Params {

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
 * The URL of an artifact that contains the .zip or .tar of static assets to deploy. The artifact belongs to the repository.
 */
'artifact_url': string;

/**
 * The target environment for this GitHub Pages deployment.
 */
'environment'?: string;

/**
 * A unique string that represents the version of the build for this deployment.
 */
'pages_build_version': string;

/**
 * The OIDC token issued by GitHub Actions certifying the origin of the deployment.
 */
'oidc_token': string;
}
}

export function reposCreatePagesDeployment(http: HttpClient, rootUrl: string, params: ReposCreatePagesDeployment$Params, context?: HttpContext): Observable<StrictHttpResponse<PageDeployment>> {
  const rb = new RequestBuilder(rootUrl, reposCreatePagesDeployment.PATH, 'post');
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
      return r as StrictHttpResponse<PageDeployment>;
    })
  );
}

reposCreatePagesDeployment.PATH = '/repos/{owner}/{repo}/pages/deployment';
