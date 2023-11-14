/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Commit } from '../../models/commit';

export interface ReposMerge$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;
      body: {

/**
 * The name of the base branch that the head will be merged into.
 */
'base': string;

/**
 * The head to merge. This can be a branch name or a commit SHA1.
 */
'head': string;

/**
 * Commit message to use for the merge commit. If omitted, a default message will be used.
 */
'commit_message'?: string;
}
}

export function reposMerge(http: HttpClient, rootUrl: string, params: ReposMerge$Params, context?: HttpContext): Observable<StrictHttpResponse<Commit>> {
  const rb = new RequestBuilder(rootUrl, reposMerge.PATH, 'post');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.body(params.body, 'application/json');
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Commit>;
    })
  );
}

reposMerge.PATH = '/repos/{owner}/{repo}/merges';
