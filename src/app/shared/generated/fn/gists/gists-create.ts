/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { GistSimple } from '../../models/gist-simple';

export interface GistsCreate$Params {
      body: {

/**
 * Description of the gist
 */
'description'?: string;

/**
 * Names and content for the files that make up the gist
 */
'files': {
[key: string]: {

/**
 * Content of the file
 */
'content': string;
};
};
'public'?: (boolean | 'true' | 'false');
}
}

export function gistsCreate(http: HttpClient, rootUrl: string, params: GistsCreate$Params, context?: HttpContext): Observable<StrictHttpResponse<GistSimple>> {
  const rb = new RequestBuilder(rootUrl, gistsCreate.PATH, 'post');
  if (params) {
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

gistsCreate.PATH = '/gists';
