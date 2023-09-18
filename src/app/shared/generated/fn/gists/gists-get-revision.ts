/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { GistSimple } from '../../models/gist-simple';

export interface GistsGetRevision$Params {

/**
 * The unique identifier of the gist.
 */
  gist_id: string;
  sha: string;
}

export function gistsGetRevision(http: HttpClient, rootUrl: string, params: GistsGetRevision$Params, context?: HttpContext): Observable<StrictHttpResponse<GistSimple>> {
  const rb = new RequestBuilder(rootUrl, gistsGetRevision.PATH, 'get');
  if (params) {
    rb.path('gist_id', params.gist_id, {});
    rb.path('sha', params.sha, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<GistSimple>;
    })
  );
}

gistsGetRevision.PATH = '/gists/{gist_id}/{sha}';
