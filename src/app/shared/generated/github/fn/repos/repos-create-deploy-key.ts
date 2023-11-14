/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { DeployKey } from '../../models/deploy-key';

export interface ReposCreateDeployKey$Params {

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
 * A name for the key.
 */
'title'?: string;

/**
 * The contents of the key.
 */
'key': string;

/**
 * If `true`, the key will only be able to read repository contents. Otherwise, the key will be able to read and write.  
 *   
 * Deploy keys with write access can perform the same actions as an organization member with admin access, or a collaborator on a personal repository. For more information, see "[Repository permission levels for an organization](https://docs.github.com/articles/repository-permission-levels-for-an-organization/)" and "[Permission levels for a user account repository](https://docs.github.com/articles/permission-levels-for-a-user-account-repository/)."
 */
'read_only'?: boolean;
}
}

export function reposCreateDeployKey(http: HttpClient, rootUrl: string, params: ReposCreateDeployKey$Params, context?: HttpContext): Observable<StrictHttpResponse<DeployKey>> {
  const rb = new RequestBuilder(rootUrl, reposCreateDeployKey.PATH, 'post');
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
      return r as StrictHttpResponse<DeployKey>;
    })
  );
}

reposCreateDeployKey.PATH = '/repos/{owner}/{repo}/keys';
