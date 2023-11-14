/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { CommitComment } from '../../models/commit-comment';

export interface ReposUpdateCommitComment$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

/**
 * The unique identifier of the comment.
 */
  comment_id: number;
      body: {

/**
 * The contents of the comment
 */
'body': string;
}
}

export function reposUpdateCommitComment(http: HttpClient, rootUrl: string, params: ReposUpdateCommitComment$Params, context?: HttpContext): Observable<StrictHttpResponse<CommitComment>> {
  const rb = new RequestBuilder(rootUrl, reposUpdateCommitComment.PATH, 'patch');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('comment_id', params.comment_id, {});
    rb.body(params.body, 'application/json');
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<CommitComment>;
    })
  );
}

reposUpdateCommitComment.PATH = '/repos/{owner}/{repo}/comments/{comment_id}';
