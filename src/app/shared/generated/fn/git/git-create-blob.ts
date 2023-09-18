/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { ShortBlob } from '../../models/short-blob';

export interface GitCreateBlob$Params {

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
 * The new blob's content.
 */
'content': string;

/**
 * The encoding used for `content`. Currently, `"utf-8"` and `"base64"` are supported.
 */
'encoding'?: string;
}
}

export function gitCreateBlob(http: HttpClient, rootUrl: string, params: GitCreateBlob$Params, context?: HttpContext): Observable<StrictHttpResponse<ShortBlob>> {
  const rb = new RequestBuilder(rootUrl, gitCreateBlob.PATH, 'post');
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
      return r as StrictHttpResponse<ShortBlob>;
    })
  );
}

gitCreateBlob.PATH = '/repos/{owner}/{repo}/git/blobs';
