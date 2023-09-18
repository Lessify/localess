/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { GistSimple } from '../../models/gist-simple';

export interface GistsUpdate$Params {

/**
 * The unique identifier of the gist.
 */
  gist_id: string;
      body: {

/**
 * The description of the gist.
 */
'description'?: string;

/**
 * The gist files to be updated, renamed, or deleted. Each `key` must match the current filename
 * (including extension) of the targeted gist file. For example: `hello.py`.
 *
 * To delete a file, set the whole file to null. For example: `hello.py : null`. The file will also be
 * deleted if the specified object does not contain at least one of `content` or `filename`.
 */
'files'?: {
[key: string]: {

/**
 * The new content of the file.
 */
'content'?: string;

/**
 * The new filename for the file.
 */
'filename'?: string | null;
};
};
}
}

export function gistsUpdate(http: HttpClient, rootUrl: string, params: GistsUpdate$Params, context?: HttpContext): Observable<StrictHttpResponse<GistSimple>> {
  const rb = new RequestBuilder(rootUrl, gistsUpdate.PATH, 'patch');
  if (params) {
    rb.path('gist_id', params.gist_id, {});
    rb.body(params.body, 'application/json');
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

gistsUpdate.PATH = '/gists/{gist_id}';
