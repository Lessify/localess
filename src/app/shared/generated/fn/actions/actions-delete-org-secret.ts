/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';


export interface ActionsDeleteOrgSecret$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;

/**
 * The name of the secret.
 */
  secret_name: string;
}

export function actionsDeleteOrgSecret(http: HttpClient, rootUrl: string, params: ActionsDeleteOrgSecret$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
  const rb = new RequestBuilder(rootUrl, actionsDeleteOrgSecret.PATH, 'delete');
  if (params) {
    rb.path('org', params.org, {});
    rb.path('secret_name', params.secret_name, {});
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

actionsDeleteOrgSecret.PATH = '/orgs/{org}/actions/secrets/{secret_name}';
