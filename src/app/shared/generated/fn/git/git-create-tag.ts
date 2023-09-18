/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { GitTag } from '../../models/git-tag';

export interface GitCreateTag$Params {

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
 * The tag's name. This is typically a version (e.g., "v0.0.1").
 */
'tag': string;

/**
 * The tag message.
 */
'message': string;

/**
 * The SHA of the git object this is tagging.
 */
'object': string;

/**
 * The type of the object we're tagging. Normally this is a `commit` but it can also be a `tree` or a `blob`.
 */
'type': 'commit' | 'tree' | 'blob';

/**
 * An object with information about the individual creating the tag.
 */
'tagger'?: {

/**
 * The name of the author of the tag
 */
'name': string;

/**
 * The email of the author of the tag
 */
'email': string;

/**
 * When this object was tagged. This is a timestamp in [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) format: `YYYY-MM-DDTHH:MM:SSZ`.
 */
'date'?: string;
};
}
}

export function gitCreateTag(http: HttpClient, rootUrl: string, params: GitCreateTag$Params, context?: HttpContext): Observable<StrictHttpResponse<GitTag>> {
  const rb = new RequestBuilder(rootUrl, gitCreateTag.PATH, 'post');
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
      return r as StrictHttpResponse<GitTag>;
    })
  );
}

gitCreateTag.PATH = '/repos/{owner}/{repo}/git/tags';
