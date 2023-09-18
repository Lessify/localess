/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { CommitComment } from '../../models/commit-comment';

export interface ReposCreateCommitComment$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

/**
 * The SHA of the commit.
 */
  commit_sha: string;
      body: {

/**
 * The contents of the comment.
 */
'body': string;

/**
 * Relative path of the file to comment on.
 */
'path'?: string;

/**
 * Line index in the diff to comment on.
 */
'position'?: number;

/**
 * **Deprecated**. Use **position** parameter instead. Line number in the file to comment on.
 */
'line'?: number;
}
}

export function reposCreateCommitComment(http: HttpClient, rootUrl: string, params: ReposCreateCommitComment$Params, context?: HttpContext): Observable<StrictHttpResponse<CommitComment>> {
  const rb = new RequestBuilder(rootUrl, reposCreateCommitComment.PATH, 'post');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('commit_sha', params.commit_sha, {});
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

reposCreateCommitComment.PATH = '/repos/{owner}/{repo}/commits/{commit_sha}/comments';
