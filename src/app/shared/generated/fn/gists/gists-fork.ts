/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { BaseGist } from '../../models/base-gist';

export interface GistsFork$Params {

/**
 * The unique identifier of the gist.
 */
  gist_id: string;
}

export function gistsFork(http: HttpClient, rootUrl: string, params: GistsFork$Params, context?: HttpContext): Observable<StrictHttpResponse<BaseGist>> {
  const rb = new RequestBuilder(rootUrl, gistsFork.PATH, 'post');
  if (params) {
    rb.path('gist_id', params.gist_id, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<BaseGist>;
    })
  );
}

gistsFork.PATH = '/gists/{gist_id}/forks';
