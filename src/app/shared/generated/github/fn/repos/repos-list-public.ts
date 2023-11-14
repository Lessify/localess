/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { MinimalRepository } from '../../models/minimal-repository';

export interface ReposListPublic$Params {

/**
 * A repository ID. Only return repositories with an ID greater than this ID.
 */
  since?: number;
}

export function reposListPublic(http: HttpClient, rootUrl: string, params?: ReposListPublic$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<MinimalRepository>>> {
  const rb = new RequestBuilder(rootUrl, reposListPublic.PATH, 'get');
  if (params) {
    rb.query('since', params.since, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Array<MinimalRepository>>;
    })
  );
}

reposListPublic.PATH = '/repositories';
