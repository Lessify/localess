/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';


export interface IssuesLock$Params {

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
 * The reason for locking the issue or pull request conversation. Lock will fail if you don't use one of these reasons:  
 *  * `off-topic`  
 *  * `too heated`  
 *  * `resolved`  
 *  * `spam`
 */
'lock_reason'?: 'off-topic' | 'too heated' | 'resolved' | 'spam';
}
}

export function issuesLock(http: HttpClient, rootUrl: string, params: IssuesLock$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
  const rb = new RequestBuilder(rootUrl, issuesLock.PATH, 'put');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('issue_number', params.issue_number, {});
    rb.body(params.body, 'application/json');
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

issuesLock.PATH = '/repos/{owner}/{repo}/issues/{issue_number}/lock';
