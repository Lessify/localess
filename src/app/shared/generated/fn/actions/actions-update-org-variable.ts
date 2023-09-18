/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';


export interface ActionsUpdateOrgVariable$Params {

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
 * The name of the variable.
 */
'name'?: string;

/**
 * The value of the variable.
 */
'value'?: string;

/**
 * The type of repositories in the organization that can access the variable. `selected` means only the repositories specified by `selected_repository_ids` can access the variable.
 */
'visibility'?: 'all' | 'private' | 'selected';

/**
 * An array of repository ids that can access the organization variable. You can only provide a list of repository ids when the `visibility` is set to `selected`.
 */
'selected_repository_ids'?: Array<number>;
}
}

export function actionsUpdateOrgVariable(http: HttpClient, rootUrl: string, params: ActionsUpdateOrgVariable$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
  const rb = new RequestBuilder(rootUrl, actionsUpdateOrgVariable.PATH, 'patch');
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

actionsUpdateOrgVariable.PATH = '/orgs/{org}/actions/variables/{name}';
