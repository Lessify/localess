/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { IssueComment } from '../../models/issue-comment';

export interface IssuesCreateComment$Params {

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
      body: {

/**
 * The contents of the comment.
 */
'body': string;
}
}

export function issuesCreateComment(http: HttpClient, rootUrl: string, params: IssuesCreateComment$Params, context?: HttpContext): Observable<StrictHttpResponse<IssueComment>> {
  const rb = new RequestBuilder(rootUrl, issuesCreateComment.PATH, 'post');
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
      return r as StrictHttpResponse<IssueComment>;
    })
  );
}

issuesCreateComment.PATH = '/repos/{owner}/{repo}/issues/{issue_number}/comments';
