/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { PullRequestSimple } from '../../models/pull-request-simple';

export interface PullsRemoveRequestedReviewers$Params {

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
      body: {

/**
 * An array of user `login`s that will be removed.
 */
'reviewers': Array<string>;

/**
 * An array of team `slug`s that will be removed.
 */
'team_reviewers'?: Array<string>;
}
}

export function pullsRemoveRequestedReviewers(http: HttpClient, rootUrl: string, params: PullsRemoveRequestedReviewers$Params, context?: HttpContext): Observable<StrictHttpResponse<PullRequestSimple>> {
  const rb = new RequestBuilder(rootUrl, pullsRemoveRequestedReviewers.PATH, 'delete');
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
      return r as StrictHttpResponse<PullRequestSimple>;
    })
  );
}

pullsRemoveRequestedReviewers.PATH = '/repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers';
