/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { OrganizationSimple } from '../../models/organization-simple';

export interface OrgsList$Params {

/**
 * An organization ID. Only return organizations with an ID greater than this ID.
 */
  since?: number;

/**
 * The number of results per page (max 100).
 */
  per_page?: number;
}

export function orgsList(http: HttpClient, rootUrl: string, params?: OrgsList$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<OrganizationSimple>>> {
  const rb = new RequestBuilder(rootUrl, orgsList.PATH, 'get');
  if (params) {
    rb.query('since', params.since, {});
    rb.query('per_page', params.per_page, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Array<OrganizationSimple>>;
    })
  );
}

orgsList.PATH = '/organizations';
