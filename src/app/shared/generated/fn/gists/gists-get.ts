/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { GistSimple } from '../../models/gist-simple';

export interface GistsGet$Params {

/**
 * The unique identifier of the gist.
 */
  gist_id: string;
}

export function gistsGet(http: HttpClient, rootUrl: string, params: GistsGet$Params, context?: HttpContext): Observable<StrictHttpResponse<GistSimple>> {
  const rb = new RequestBuilder(rootUrl, gistsGet.PATH, 'get');
  if (params) {
    rb.path('gist_id', params.gist_id, {});
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

gistsGet.PATH = '/gists/{gist_id}';
