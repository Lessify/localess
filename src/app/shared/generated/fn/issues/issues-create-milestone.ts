/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Milestone } from '../../models/milestone';

export interface IssuesCreateMilestone$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;
      body: {

/**
 * The title of the milestone.
 */
'title': string;

/**
 * The state of the milestone. Either `open` or `closed`.
 */
'state'?: 'open' | 'closed';

/**
 * A description of the milestone.
 */
'description'?: string;

/**
 * The milestone due date. This is a timestamp in [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) format: `YYYY-MM-DDTHH:MM:SSZ`.
 */
'due_on'?: string;
}
}

export function issuesCreateMilestone(http: HttpClient, rootUrl: string, params: IssuesCreateMilestone$Params, context?: HttpContext): Observable<StrictHttpResponse<Milestone>> {
  const rb = new RequestBuilder(rootUrl, issuesCreateMilestone.PATH, 'post');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.body(params.body, 'application/json');
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

issuesCreateMilestone.PATH = '/repos/{owner}/{repo}/milestones';
