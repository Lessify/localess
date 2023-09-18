/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';


export interface TeamsDeleteDiscussionLegacy$Params {

/**
 * The unique identifier of the team.
 */
  team_id: number;

/**
 * The number that identifies the discussion.
 */
  discussion_number: number;
}

export function teamsDeleteDiscussionLegacy(http: HttpClient, rootUrl: string, params: TeamsDeleteDiscussionLegacy$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
  const rb = new RequestBuilder(rootUrl, teamsDeleteDiscussionLegacy.PATH, 'delete');
  if (params) {
    rb.path('team_id', params.team_id, {});
    rb.path('discussion_number', params.discussion_number, {});
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

teamsDeleteDiscussionLegacy.PATH = '/teams/{team_id}/discussions/{discussion_number}';
