/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { PullRequestReviewRequest } from '../../models/pull-request-review-request';

export interface PullsListRequestedReviewers$Params {

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
}

export function pullsListRequestedReviewers(http: HttpClient, rootUrl: string, params: PullsListRequestedReviewers$Params, context?: HttpContext): Observable<StrictHttpResponse<PullRequestReviewRequest>> {
  const rb = new RequestBuilder(rootUrl, pullsListRequestedReviewers.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('pull_number', params.pull_number, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<PullRequestReviewRequest>;
    })
  );
}

pullsListRequestedReviewers.PATH = '/repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers';
