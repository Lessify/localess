/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { CopilotOrganizationDetails } from '../../models/copilot-organization-details';

export interface CopilotGetCopilotOrganizationDetails$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;
}

export function copilotGetCopilotOrganizationDetails(http: HttpClient, rootUrl: string, params: CopilotGetCopilotOrganizationDetails$Params, context?: HttpContext): Observable<StrictHttpResponse<CopilotOrganizationDetails>> {
  const rb = new RequestBuilder(rootUrl, copilotGetCopilotOrganizationDetails.PATH, 'get');
  if (params) {
    rb.path('org', params.org, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<CopilotOrganizationDetails>;
    })
  );
}

copilotGetCopilotOrganizationDetails.PATH = '/orgs/{org}/copilot/billing';
