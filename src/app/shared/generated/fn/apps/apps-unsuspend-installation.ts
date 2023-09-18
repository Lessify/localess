/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';


export interface AppsUnsuspendInstallation$Params {

/**
 * The unique identifier of the installation.
 */
  installation_id: number;
}

export function appsUnsuspendInstallation(http: HttpClient, rootUrl: string, params: AppsUnsuspendInstallation$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
  const rb = new RequestBuilder(rootUrl, appsUnsuspendInstallation.PATH, 'delete');
  if (params) {
    rb.path('installation_id', params.installation_id, {});
  }

  return http.request(
    rb.build({ responseType: 'text', accept: '*/*', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return (r as HttpResponse<any>).clone({ body: undefined }) as StrictHttpResponse<void>;
    })
  );
}

appsUnsuspendInstallation.PATH = '/app/installations/{installation_id}/suspended';
