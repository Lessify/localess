/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { ContentDirectory } from '../../models/content-directory';
import { ContentFile } from '../../models/content-file';
import { ContentSubmodule } from '../../models/content-submodule';
import { ContentSymlink } from '../../models/content-symlink';

export interface ReposGetContent$Json$Params {

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

/**
 * The name of the commit/branch/tag. Default: the repository’s default branch.
 */
  ref?: string;
}

export function reposGetContent$Json(http: HttpClient, rootUrl: string, params: ReposGetContent$Json$Params, context?: HttpContext): Observable<StrictHttpResponse<(ContentDirectory | ContentFile | ContentSymlink | ContentSubmodule)>> {
  const rb = new RequestBuilder(rootUrl, reposGetContent$Json.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('path', params.path, {});
    rb.query('ref', params.ref, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<(ContentDirectory | ContentFile | ContentSymlink | ContentSubmodule)>;
    })
  );
}

reposGetContent$Json.PATH = '/repos/{owner}/{repo}/contents/{path}';
