/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { SelectedActions } from '../../models/selected-actions';

export interface ActionsSetAllowedActionsOrganization$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;
      body?: SelectedActions
}

export function actionsSetAllowedActionsOrganization(http: HttpClient, rootUrl: string, params: ActionsSetAllowedActionsOrganization$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
  const rb = new RequestBuilder(rootUrl, actionsSetAllowedActionsOrganization.PATH, 'put');
  if (params) {
    rb.path('org', params.org, {});
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

actionsSetAllowedActionsOrganization.PATH = '/orgs/{org}/actions/permissions/selected-actions';
