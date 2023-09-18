/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { ReleaseAsset } from '../../models/release-asset';

export interface ReposGetReleaseAsset$Params {

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
}

export function reposGetReleaseAsset(http: HttpClient, rootUrl: string, params: ReposGetReleaseAsset$Params, context?: HttpContext): Observable<StrictHttpResponse<ReleaseAsset>> {
  const rb = new RequestBuilder(rootUrl, reposGetReleaseAsset.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('asset_id', params.asset_id, {});
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

reposGetReleaseAsset.PATH = '/repos/{owner}/{repo}/releases/assets/{asset_id}';
