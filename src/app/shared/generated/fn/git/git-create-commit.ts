/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { GitCommit } from '../../models/git-commit';

export interface GitCreateCommit$Params {

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
 * The commit message
 */
'message': string;

/**
 * The SHA of the tree object this commit points to
 */
'tree': string;

/**
 * The SHAs of the commits that were the parents of this commit. If omitted or empty, the commit will be written as a root commit. For a single parent, an array of one SHA should be provided; for a merge commit, an array of more than one should be provided.
 */
'parents'?: Array<string>;

/**
 * Information about the author of the commit. By default, the `author` will be the authenticated user and the current date. See the `author` and `committer` object below for details.
 */
'author'?: {

/**
 * The name of the author (or committer) of the commit
 */
'name': string;

/**
 * The email of the author (or committer) of the commit
 */
'email': string;

/**
 * Indicates when this commit was authored (or committed). This is a timestamp in [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) format: `YYYY-MM-DDTHH:MM:SSZ`.
 */
'date'?: string;
};

/**
 * Information about the person who is making the commit. By default, `committer` will use the information set in `author`. See the `author` and `committer` object below for details.
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

/**
 * Indicates when this commit was authored (or committed). This is a timestamp in [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) format: `YYYY-MM-DDTHH:MM:SSZ`.
 */
'date'?: string;
};

/**
 * The [PGP signature](https://en.wikipedia.org/wiki/Pretty_Good_Privacy) of the commit. GitHub adds the signature to the `gpgsig` header of the created commit. For a commit signature to be verifiable by Git or GitHub, it must be an ASCII-armored detached PGP signature over the string commit as it would be written to the object database. To pass a `signature` parameter, you need to first manually create a valid PGP signature, which can be complicated. You may find it easier to [use the command line](https://git-scm.com/book/id/v2/Git-Tools-Signing-Your-Work) to create signed commits.
 */
'signature'?: string;
}
}

export function gitCreateCommit(http: HttpClient, rootUrl: string, params: GitCreateCommit$Params, context?: HttpContext): Observable<StrictHttpResponse<GitCommit>> {
  const rb = new RequestBuilder(rootUrl, gitCreateCommit.PATH, 'post');
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
      return r as StrictHttpResponse<GitCommit>;
    })
  );
}

gitCreateCommit.PATH = '/repos/{owner}/{repo}/git/commits';
