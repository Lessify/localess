/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { PullRequest } from '../../models/pull-request';

export interface PullsUpdate$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

/**
 * The number that identifies the pull request.
 */
  pull_number: number;
      body?: {

/**
 * The title of the pull request.
 */
'title'?: string;

/**
 * The contents of the pull request.
 */
'body'?: string;

/**
 * State of this Pull Request. Either `open` or `closed`.
 */
'state'?: 'open' | 'closed';

/**
 * The name of the branch you want your changes pulled into. This should be an existing branch on the current repository. You cannot update the base branch on a pull request to point to another repository.
 */
'base'?: string;

/**
 * Indicates whether [maintainers can modify](https://docs.github.com/articles/allowing-changes-to-a-pull-request-branch-created-from-a-fork/) the pull request.
 */
'maintainer_can_modify'?: boolean;
}
}

export function pullsUpdate(http: HttpClient, rootUrl: string, params: PullsUpdate$Params, context?: HttpContext): Observable<StrictHttpResponse<PullRequest>> {
  const rb = new RequestBuilder(rootUrl, pullsUpdate.PATH, 'patch');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('pull_number', params.pull_number, {});
    rb.body(params.body, 'application/json');
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<PullRequest>;
    })
  );
}

pullsUpdate.PATH = '/repos/{owner}/{repo}/pulls/{pull_number}';
