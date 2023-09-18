/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { ActionsCacheUsageOrgEnterprise } from '../../models/actions-cache-usage-org-enterprise';

export interface ActionsGetActionsCacheUsageForOrg$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;
}

export function actionsGetActionsCacheUsageForOrg(http: HttpClient, rootUrl: string, params: ActionsGetActionsCacheUsageForOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<ActionsCacheUsageOrgEnterprise>> {
  const rb = new RequestBuilder(rootUrl, actionsGetActionsCacheUsageForOrg.PATH, 'get');
  if (params) {
    rb.path('org', params.org, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<ActionsCacheUsageOrgEnterprise>;
    })
  );
}

actionsGetActionsCacheUsageForOrg.PATH = '/orgs/{org}/actions/cache/usage';
