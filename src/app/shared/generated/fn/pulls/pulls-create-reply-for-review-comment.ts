/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { PullRequestReviewComment } from '../../models/pull-request-review-comment';

export interface PullsCreateReplyForReviewComment$Params {

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
 * The unique identifier of the comment.
 */
  comment_id: number;
      body: {

/**
 * The text of the review comment.
 */
'body': string;
}
}

export function pullsCreateReplyForReviewComment(http: HttpClient, rootUrl: string, params: PullsCreateReplyForReviewComment$Params, context?: HttpContext): Observable<StrictHttpResponse<PullRequestReviewComment>> {
  const rb = new RequestBuilder(rootUrl, pullsCreateReplyForReviewComment.PATH, 'post');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('pull_number', params.pull_number, {});
    rb.path('comment_id', params.comment_id, {});
    rb.body(params.body, 'application/json');
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<PullRequestReviewComment>;
    })
  );
}

pullsCreateReplyForReviewComment.PATH = '/repos/{owner}/{repo}/pulls/{pull_number}/comments/{comment_id}/replies';
