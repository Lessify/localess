/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Milestone } from '../../models/milestone';

export interface IssuesGetMilestone$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

/**
 * The number that identifies the milestone.
 */
  milestone_number: number;
}

export function issuesGetMilestone(http: HttpClient, rootUrl: string, params: IssuesGetMilestone$Params, context?: HttpContext): Observable<StrictHttpResponse<Milestone>> {
  const rb = new RequestBuilder(rootUrl, issuesGetMilestone.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('milestone_number', params.milestone_number, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Milestone>;
    })
  );
}

issuesGetMilestone.PATH = '/repos/{owner}/{repo}/milestones/{milestone_number}';
