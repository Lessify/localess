/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Status } from '../../models/status';

export interface ReposCreateCommitStatus$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;
  sha: string;
      body: {

/**
 * The state of the status.
 */
'state': 'error' | 'failure' | 'pending' | 'success';

/**
 * The target URL to associate with this status. This URL will be linked from the GitHub UI to allow users to easily see the source of the status.  
 * For example, if your continuous integration system is posting build status, you would want to provide the deep link for the build output for this specific SHA:  
 * `http://ci.example.com/user/repo/build/sha`
 */
'target_url'?: string | null;

/**
 * A short description of the status.
 */
'description'?: string | null;

/**
 * A string label to differentiate this status from the status of other systems. This field is case-insensitive.
 */
'context'?: string;
}
}

export function reposCreateCommitStatus(http: HttpClient, rootUrl: string, params: ReposCreateCommitStatus$Params, context?: HttpContext): Observable<StrictHttpResponse<Status>> {
  const rb = new RequestBuilder(rootUrl, reposCreateCommitStatus.PATH, 'post');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('sha', params.sha, {});
    rb.body(params.body, 'application/json');
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Status>;
    })
  );
}

reposCreateCommitStatus.PATH = '/repos/{owner}/{repo}/statuses/{sha}';
