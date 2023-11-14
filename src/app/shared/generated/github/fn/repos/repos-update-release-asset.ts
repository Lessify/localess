/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { ReleaseAsset } from '../../models/release-asset';

export interface ReposUpdateReleaseAsset$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

/**
 * The unique identifier of the asset.
 */
  asset_id: number;
      body?: {

/**
 * The file name of the asset.
 */
'name'?: string;

/**
 * An alternate short description of the asset. Used in place of the filename.
 */
'label'?: string;
'state'?: string;
}
}

export function reposUpdateReleaseAsset(http: HttpClient, rootUrl: string, params: ReposUpdateReleaseAsset$Params, context?: HttpContext): Observable<StrictHttpResponse<ReleaseAsset>> {
  const rb = new RequestBuilder(rootUrl, reposUpdateReleaseAsset.PATH, 'patch');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('asset_id', params.asset_id, {});
    rb.body(params.body, 'application/json');
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

reposUpdateReleaseAsset.PATH = '/repos/{owner}/{repo}/releases/assets/{asset_id}';
