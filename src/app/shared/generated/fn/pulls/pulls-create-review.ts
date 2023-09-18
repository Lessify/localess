/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { PullRequestReview } from '../../models/pull-request-review';

export interface PullsCreateReview$Params {

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
 * The SHA of the commit that needs a review. Not using the latest commit SHA may render your review comment outdated if a subsequent commit modifies the line you specify as the `position`. Defaults to the most recent commit in the pull request when you do not specify a value.
 */
'commit_id'?: string;

/**
 * **Required** when using `REQUEST_CHANGES` or `COMMENT` for the `event` parameter. The body text of the pull request review.
 */
'body'?: string;

/**
 * The review action you want to perform. The review actions include: `APPROVE`, `REQUEST_CHANGES`, or `COMMENT`. By leaving this blank, you set the review action state to `PENDING`, which means you will need to [submit the pull request review](https://docs.github.com/rest/pulls/reviews#submit-a-review-for-a-pull-request) when you are ready.
 */
'event'?: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT';

/**
 * Use the following table to specify the location, destination, and contents of the draft review comment.
 */
'comments'?: Array<{

/**
 * The relative path to the file that necessitates a review comment.
 */
'path': string;

/**
 * The position in the diff where you want to add a review comment. Note this value is not the same as the line number in the file. For help finding the position value, read the note below.
 */
'position'?: number;

/**
 * Text of the review comment.
 */
'body': string;
'line'?: number;
'side'?: string;
'start_line'?: number;
'start_side'?: string;
}>;
}
}

export function pullsCreateReview(http: HttpClient, rootUrl: string, params: PullsCreateReview$Params, context?: HttpContext): Observable<StrictHttpResponse<PullRequestReview>> {
  const rb = new RequestBuilder(rootUrl, pullsCreateReview.PATH, 'post');
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
      return r as StrictHttpResponse<PullRequestReview>;
    })
  );
}

pullsCreateReview.PATH = '/repos/{owner}/{repo}/pulls/{pull_number}/reviews';
