/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Label } from '../../models/label';

export interface IssuesAddLabels$Params {

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
      body?: ({

/**
 * The names of the labels to add to the issue's existing labels. You can pass an empty array to remove all labels. Alternatively, you can pass a single label as a `string` or an `array` of labels directly, but GitHub recommends passing an object with the `labels` key. You can also replace all of the labels for an issue. For more information, see "[Set labels for an issue](https://docs.github.com/rest/issues/labels#set-labels-for-an-issue)."
 */
'labels'?: Array<string>;
} | Array<string> | {
'labels'?: Array<{
'name': string;
}>;
} | Array<{
'name': string;
}> | string)
}

export function issuesAddLabels(http: HttpClient, rootUrl: string, params: IssuesAddLabels$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Label>>> {
  const rb = new RequestBuilder(rootUrl, issuesAddLabels.PATH, 'post');
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
      return r as StrictHttpResponse<Array<Label>>;
    })
  );
}

issuesAddLabels.PATH = '/repos/{owner}/{repo}/issues/{issue_number}/labels';
