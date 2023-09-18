/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Issue } from '../../models/issue';

export interface IssuesCreate$Params {

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
 * The title of the issue.
 */
'title': (string | number);

/**
 * The contents of the issue.
 */
'body'?: string;

/**
 * Login for the user that this issue should be assigned to. _NOTE: Only users with push access can set the assignee for new issues. The assignee is silently dropped otherwise. **This field is deprecated.**_
 */
'assignee'?: string | null;
'milestone'?: (string | number) | null;

/**
 * Labels to associate with this issue. _NOTE: Only users with push access can set labels for new issues. Labels are silently dropped otherwise._
 */
'labels'?: Array<(string | {
'id'?: number;
'name'?: string;
'description'?: string | null;
'color'?: string | null;
})>;

/**
 * Logins for Users to assign to this issue. _NOTE: Only users with push access can set assignees for new issues. Assignees are silently dropped otherwise._
 */
'assignees'?: Array<string>;
}
}

export function issuesCreate(http: HttpClient, rootUrl: string, params: IssuesCreate$Params, context?: HttpContext): Observable<StrictHttpResponse<Issue>> {
  const rb = new RequestBuilder(rootUrl, issuesCreate.PATH, 'post');
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
      return r as StrictHttpResponse<Issue>;
    })
  );
}

issuesCreate.PATH = '/repos/{owner}/{repo}/issues';
