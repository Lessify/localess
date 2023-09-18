/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { TeamDiscussionComment } from '../../models/team-discussion-comment';

export interface TeamsUpdateDiscussionCommentLegacy$Params {

/**
 * The unique identifier of the team.
 */
  team_id: number;

/**
 * The number that identifies the discussion.
 */
  discussion_number: number;

/**
 * The number that identifies the comment.
 */
  comment_number: number;
      body: {

/**
 * The discussion comment's body text.
 */
'body': string;
}
}

export function teamsUpdateDiscussionCommentLegacy(http: HttpClient, rootUrl: string, params: TeamsUpdateDiscussionCommentLegacy$Params, context?: HttpContext): Observable<StrictHttpResponse<TeamDiscussionComment>> {
  const rb = new RequestBuilder(rootUrl, teamsUpdateDiscussionCommentLegacy.PATH, 'patch');
  if (params) {
    rb.path('team_id', params.team_id, {});
    rb.path('discussion_number', params.discussion_number, {});
    rb.path('comment_number', params.comment_number, {});
    rb.body(params.body, 'application/json');
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<TeamDiscussionComment>;
    })
  );
}

teamsUpdateDiscussionCommentLegacy.PATH = '/teams/{team_id}/discussions/{discussion_number}/comments/{comment_number}';
