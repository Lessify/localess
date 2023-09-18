/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';


export interface ActionsSetSelectedReposForOrgVariable$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;

/**
 * The name of the variable.
 */
  name: string;
      body: {

/**
 * The IDs of the repositories that can access the organization variable.
 */
'selected_repository_ids': Array<number>;
}
}

export function actionsSetSelectedReposForOrgVariable(http: HttpClient, rootUrl: string, params: ActionsSetSelectedReposForOrgVariable$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
  const rb = new RequestBuilder(rootUrl, actionsSetSelectedReposForOrgVariable.PATH, 'put');
  if (params) {
    rb.path('org', params.org, {});
    rb.path('name', params.name, {});
    rb.body(params.body, 'application/json');
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

actionsSetSelectedReposForOrgVariable.PATH = '/orgs/{org}/actions/variables/{name}/repositories';
