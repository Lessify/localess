/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { FileCommit } from '../../models/file-commit';

export interface ReposCreateOrUpdateFileContents$Params {

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
 * The new file content, using Base64 encoding.
 */
'content': string;

/**
 * **Required if you are updating a file**. The blob SHA of the file being replaced.
 */
'sha'?: string;

/**
 * The branch name. Default: the repository’s default branch.
 */
'branch'?: string;

/**
 * The person that committed the file. Default: the authenticated user.
 */
'committer'?: {

/**
 * The name of the author or committer of the commit. You'll receive a `422` status code if `name` is omitted.
 */
'name': string;

/**
 * The email of the author or committer of the commit. You'll receive a `422` status code if `email` is omitted.
 */
'email': string;
'date'?: string;
};

/**
 * The author of the file. Default: The `committer` or the authenticated user if you omit `committer`.
 */
'author'?: {

/**
 * The name of the author or committer of the commit. You'll receive a `422` status code if `name` is omitted.
 */
'name': string;

/**
 * The email of the author or committer of the commit. You'll receive a `422` status code if `email` is omitted.
 */
'email': string;
'date'?: string;
};
}
}

export function reposCreateOrUpdateFileContents(http: HttpClient, rootUrl: string, params: ReposCreateOrUpdateFileContents$Params, context?: HttpContext): Observable<StrictHttpResponse<FileCommit>> {
  const rb = new RequestBuilder(rootUrl, reposCreateOrUpdateFileContents.PATH, 'put');
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

reposCreateOrUpdateFileContents.PATH = '/repos/{owner}/{repo}/contents/{path}';
