/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { ReviewCustomGatesCommentRequired } from '../../models/review-custom-gates-comment-required';
import { ReviewCustomGatesStateRequired } from '../../models/review-custom-gates-state-required';

export interface ActionsReviewCustomGatesForRun$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

/**
 * The unique identifier of the workflow run.
 */
  run_id: number;
      body: (ReviewCustomGatesCommentRequired | ReviewCustomGatesStateRequired)
}

export function actionsReviewCustomGatesForRun(http: HttpClient, rootUrl: string, params: ActionsReviewCustomGatesForRun$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
  const rb = new RequestBuilder(rootUrl, actionsReviewCustomGatesForRun.PATH, 'post');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('run_id', params.run_id, {});
    rb.body(params.body, 'application/json');
  }

  return http.request(
    rb.build({ responseType: 'text', accept: '*/*', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return (r as HttpResponse<any>).clone({ body: undefined }) as StrictHttpResponse<void>;
    })
  );
}

actionsReviewCustomGatesForRun.PATH = '/repos/{owner}/{repo}/actions/runs/{run_id}/deployment_protection_rule';
