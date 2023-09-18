/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Issue } from '../../models/issue';

export interface IssuesUpdate$Params {

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
 * The title of the issue.
 */
'title'?: (string | number) | null;

/**
 * The contents of the issue.
 */
'body'?: string | null;

/**
 * Username to assign to this issue. **This field is deprecated.**
 */
'assignee'?: string | null;

/**
 * The open or closed state of the issue.
 */
'state'?: 'open' | 'closed';

/**
 * The reason for the state change. Ignored unless `state` is changed.
 */
'state_reason'?: 'completed' | 'not_planned' | 'reopened' | null;
'milestone'?: (string | number) | null;

/**
 * Labels to associate with this issue. Pass one or more labels to _replace_ the set of labels on this issue. Send an empty array (`[]`) to clear all labels from the issue. Only users with push access can set labels for issues. Without push access to the repository, label changes are silently dropped.
 */
'labels'?: Array<(string | {
'id'?: number;
'name'?: string;
'description'?: string | null;
'color'?: string | null;
})>;

/**
 * Usernames to assign to this issue. Pass one or more user logins to _replace_ the set of assignees on this issue. Send an empty array (`[]`) to clear all assignees from the issue. Only users with push access can set assignees for new issues. Without push access to the repository, assignee changes are silently dropped.
 */
'assignees'?: Array<string>;
}
}

export function issuesUpdate(http: HttpClient, rootUrl: string, params: IssuesUpdate$Params, context?: HttpContext): Observable<StrictHttpResponse<Issue>> {
  const rb = new RequestBuilder(rootUrl, issuesUpdate.PATH, 'patch');
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

issuesUpdate.PATH = '/repos/{owner}/{repo}/issues/{issue_number}';
