/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { PullRequestMergeResult } from '../../models/pull-request-merge-result';

export interface PullsMerge$Params {

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
 * Title for the automatic commit message.
 */
'commit_title'?: string;

/**
 * Extra detail to append to automatic commit message.
 */
'commit_message'?: string;

/**
 * SHA that pull request head must match to allow merge.
 */
'sha'?: string;

/**
 * The merge method to use.
 */
'merge_method'?: 'merge' | 'squash' | 'rebase';
}
}

export function pullsMerge(http: HttpClient, rootUrl: string, params: PullsMerge$Params, context?: HttpContext): Observable<StrictHttpResponse<PullRequestMergeResult>> {
  const rb = new RequestBuilder(rootUrl, pullsMerge.PATH, 'put');
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
      return r as StrictHttpResponse<PullRequestMergeResult>;
    })
  );
}

pullsMerge.PATH = '/repos/{owner}/{repo}/pulls/{pull_number}/merge';
