/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';


export interface ActionsAddSelectedRepoToOrgVariable$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;

/**
 * The name of the variable.
 */
  name: string;
  repository_id: number;
}

export function actionsAddSelectedRepoToOrgVariable(http: HttpClient, rootUrl: string, params: ActionsAddSelectedRepoToOrgVariable$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
  const rb = new RequestBuilder(rootUrl, actionsAddSelectedRepoToOrgVariable.PATH, 'put');
  if (params) {
    rb.path('org', params.org, {});
    rb.path('name', params.name, {});
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

actionsAddSelectedRepoToOrgVariable.PATH = '/orgs/{org}/actions/variables/{name}/repositories/{repository_id}';
