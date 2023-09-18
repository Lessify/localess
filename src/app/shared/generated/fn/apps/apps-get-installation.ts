/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Installation } from '../../models/installation';

export interface AppsGetInstallation$Params {

/**
 * The unique identifier of the installation.
 */
  installation_id: number;
}

export function appsGetInstallation(http: HttpClient, rootUrl: string, params: AppsGetInstallation$Params, context?: HttpContext): Observable<StrictHttpResponse<Installation>> {
  const rb = new RequestBuilder(rootUrl, appsGetInstallation.PATH, 'get');
  if (params) {
    rb.path('installation_id', params.installation_id, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Installation>;
    })
  );
}

appsGetInstallation.PATH = '/app/installations/{installation_id}';
