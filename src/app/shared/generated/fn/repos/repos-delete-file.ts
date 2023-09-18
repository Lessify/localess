/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { FileCommit } from '../../models/file-commit';

export interface ReposDeleteFile$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

/**
 * path parameter
 */
  path: string;
      body: {

/**
 * The commit message.
 */
'message': string;

/**
 * The blob SHA of the file being deleted.
 */
'sha': string;

/**
 * The branch name. Default: the repository’s default branch
 */
'branch'?: string;

/**
 * object containing information about the committer.
 */
'committer'?: {

/**
 * The name of the author (or committer) of the commit
 */
'name'?: string;

/**
 * The email of the author (or committer) of the commit
 */
'email'?: string;
};

/**
 * object containing information about the author.
 */
'author'?: {

/**
 * The name of the author (or committer) of the commit
 */
'name'?: string;

/**
 * The email of the author (or committer) of the commit
 */
'email'?: string;
};
}
}

export function reposDeleteFile(http: HttpClient, rootUrl: string, params: ReposDeleteFile$Params, context?: HttpContext): Observable<StrictHttpResponse<FileCommit>> {
  const rb = new RequestBuilder(rootUrl, reposDeleteFile.PATH, 'delete');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('path', params.path, {});
    rb.body(params.body, 'application/json');
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<FileCommit>;
    })
  );
}

reposDeleteFile.PATH = '/repos/{owner}/{repo}/contents/{path}';
