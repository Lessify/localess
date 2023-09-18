/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { ReleaseAsset } from '../../models/release-asset';

export interface ReposUploadReleaseAsset$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

/**
 * The unique identifier of the release.
 */
  release_id: number;
  name: string;
  label?: string;
      body?: Blob
}

export function reposUploadReleaseAsset(http: HttpClient, rootUrl: string, params: ReposUploadReleaseAsset$Params, context?: HttpContext): Observable<StrictHttpResponse<ReleaseAsset>> {
  const rb = new RequestBuilder(rootUrl, reposUploadReleaseAsset.PATH, 'post');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('release_id', params.release_id, {});
    rb.query('name', params.name, {});
    rb.query('label', params.label, {});
    rb.body(params.body, 'application/octet-stream');
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<ReleaseAsset>;
    })
  );
}

reposUploadReleaseAsset.PATH = '/repos/{owner}/{repo}/releases/{release_id}/assets';
