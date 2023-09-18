/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';


export interface ReactionsDeleteForPullRequestComment$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

/**
 * The unique identifier of the comment.
 */
  comment_id: number;

/**
 * The unique identifier of the reaction.
 */
  reaction_id: number;
}

export function reactionsDeleteForPullRequestComment(http: HttpClient, rootUrl: string, params: ReactionsDeleteForPullRequestComment$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
  const rb = new RequestBuilder(rootUrl, reactionsDeleteForPullRequestComment.PATH, 'delete');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('comment_id', params.comment_id, {});
    rb.path('reaction_id', params.reaction_id, {});
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

reactionsDeleteForPullRequestComment.PATH = '/repos/{owner}/{repo}/pulls/comments/{comment_id}/reactions/{reaction_id}';
