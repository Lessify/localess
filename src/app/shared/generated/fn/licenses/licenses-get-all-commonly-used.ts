/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { LicenseSimple } from '../../models/license-simple';

export interface LicensesGetAllCommonlyUsed$Params {
  featured?: boolean;

/**
 * The number of results per page (max 100).
 */
  per_page?: number;

/**
 * Page number of the results to fetch.
 */
  page?: number;
}

export function licensesGetAllCommonlyUsed(http: HttpClient, rootUrl: string, params?: LicensesGetAllCommonlyUsed$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<LicenseSimple>>> {
  const rb = new RequestBuilder(rootUrl, licensesGetAllCommonlyUsed.PATH, 'get');
  if (params) {
    rb.query('featured', params.featured, {});
    rb.query('per_page', params.per_page, {});
    rb.query('page', params.page, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Array<LicenseSimple>>;
    })
  );
}

licensesGetAllCommonlyUsed.PATH = '/licenses';
