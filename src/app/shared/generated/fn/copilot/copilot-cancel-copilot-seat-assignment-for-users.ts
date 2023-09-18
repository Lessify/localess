/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';


export interface CopilotCancelCopilotSeatAssignmentForUsers$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;
      body: {

/**
 * The usernames of the organization members for which to revoke access to GitHub Copilot.
 */
'selected_usernames': Array<string>;
}
}

export function copilotCancelCopilotSeatAssignmentForUsers(http: HttpClient, rootUrl: string, params: CopilotCancelCopilotSeatAssignmentForUsers$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'seats_cancelled': number;
}>> {
  const rb = new RequestBuilder(rootUrl, copilotCancelCopilotSeatAssignmentForUsers.PATH, 'delete');
  if (params) {
    rb.path('org', params.org, {});
    rb.body(params.body, 'application/json');
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<{
      'seats_cancelled': number;
      }>;
    })
  );
}

copilotCancelCopilotSeatAssignmentForUsers.PATH = '/orgs/{org}/copilot/billing/selected_users';
