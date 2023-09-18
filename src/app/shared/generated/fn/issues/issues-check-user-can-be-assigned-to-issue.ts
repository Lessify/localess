/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';


export interface IssuesCheckUserCanBeAssignedToIssue$Params {

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
  assignee: string;
}

export function issuesCheckUserCanBeAssignedToIssue(http: HttpClient, rootUrl: string, params: IssuesCheckUserCanBeAssignedToIssue$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
  const rb = new RequestBuilder(rootUrl, issuesCheckUserCanBeAssignedToIssue.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('issue_number', params.issue_number, {});
    rb.path('assignee', params.assignee, {});
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

issuesCheckUserCanBeAssignedToIssue.PATH = '/repos/{owner}/{repo}/issues/{issue_number}/assignees/{assignee}';
