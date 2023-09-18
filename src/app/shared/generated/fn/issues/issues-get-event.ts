/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { IssueEvent } from '../../models/issue-event';

export interface IssuesGetEvent$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;
  event_id: number;
}

export function issuesGetEvent(http: HttpClient, rootUrl: string, params: IssuesGetEvent$Params, context?: HttpContext): Observable<StrictHttpResponse<IssueEvent>> {
  const rb = new RequestBuilder(rootUrl, issuesGetEvent.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('event_id', params.event_id, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<IssueEvent>;
    })
  );
}

issuesGetEvent.PATH = '/repos/{owner}/{repo}/issues/events/{event_id}';
