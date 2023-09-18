/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';


export interface DependabotRemoveSelectedRepoFromOrgSecret$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;

/**
 * The name of the secret.
 */
  secret_name: string;
  repository_id: number;
}

export function dependabotRemoveSelectedRepoFromOrgSecret(http: HttpClient, rootUrl: string, params: DependabotRemoveSelectedRepoFromOrgSecret$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
  const rb = new RequestBuilder(rootUrl, dependabotRemoveSelectedRepoFromOrgSecret.PATH, 'delete');
  if (params) {
    rb.path('org', params.org, {});
    rb.path('secret_name', params.secret_name, {});
    rb.path('repository_id', params.repository_id, {});
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

dependabotRemoveSelectedRepoFromOrgSecret.PATH = '/orgs/{org}/dependabot/secrets/{secret_name}/repositories/{repository_id}';
