/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Issue } from '../../models/issue';

export interface IssuesAddAssignees$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

/**
 * The number that identifies the issue.
 */
  issue_number: number;
      body?: {

/**
 * Usernames of people to assign this issue to. _NOTE: Only users with push access can add assignees to an issue. Assignees are silently ignored otherwise._
 */
'assignees'?: Array<string>;
}
}

export function issuesAddAssignees(http: HttpClient, rootUrl: string, params: IssuesAddAssignees$Params, context?: HttpContext): Observable<StrictHttpResponse<Issue>> {
  const rb = new RequestBuilder(rootUrl, issuesAddAssignees.PATH, 'post');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('issue_number', params.issue_number, {});
    rb.body(params.body, 'application/json');
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Issue>;
    })
  );
}

issuesAddAssignees.PATH = '/repos/{owner}/{repo}/issues/{issue_number}/assignees';
