/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { PullRequestReview } from '../../models/pull-request-review';

export interface PullsDeletePendingReview$Params {

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

/**
 * The unique identifier of the review.
 */
  review_id: number;
}

export function pullsDeletePendingReview(http: HttpClient, rootUrl: string, params: PullsDeletePendingReview$Params, context?: HttpContext): Observable<StrictHttpResponse<PullRequestReview>> {
  const rb = new RequestBuilder(rootUrl, pullsDeletePendingReview.PATH, 'delete');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('pull_number', params.pull_number, {});
    rb.path('review_id', params.review_id, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<PullRequestReview>;
    })
  );
}

pullsDeletePendingReview.PATH = '/repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}';
