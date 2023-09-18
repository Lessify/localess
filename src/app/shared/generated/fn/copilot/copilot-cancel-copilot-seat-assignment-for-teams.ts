/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';


export interface CopilotCancelCopilotSeatAssignmentForTeams$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;
      body: {

/**
 * The names of teams from which to revoke access to GitHub Copilot.
 */
'selected_teams': Array<string>;
}
}

export function copilotCancelCopilotSeatAssignmentForTeams(http: HttpClient, rootUrl: string, params: CopilotCancelCopilotSeatAssignmentForTeams$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'seats_cancelled': number;
}>> {
  const rb = new RequestBuilder(rootUrl, copilotCancelCopilotSeatAssignmentForTeams.PATH, 'delete');
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

copilotCancelCopilotSeatAssignmentForTeams.PATH = '/orgs/{org}/copilot/billing/selected_teams';
