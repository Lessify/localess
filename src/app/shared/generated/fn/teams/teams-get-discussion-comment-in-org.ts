/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { TeamDiscussionComment } from '../../models/team-discussion-comment';

export interface TeamsGetDiscussionCommentInOrg$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;

/**
 * The slug of the team name.
 */
  team_slug: string;

/**
 * The number that identifies the discussion.
 */
  discussion_number: number;

/**
 * The number that identifies the comment.
 */
  comment_number: number;
}

export function teamsGetDiscussionCommentInOrg(http: HttpClient, rootUrl: string, params: TeamsGetDiscussionCommentInOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<TeamDiscussionComment>> {
  const rb = new RequestBuilder(rootUrl, teamsGetDiscussionCommentInOrg.PATH, 'get');
  if (params) {
    rb.path('org', params.org, {});
    rb.path('team_slug', params.team_slug, {});
    rb.path('discussion_number', params.discussion_number, {});
    rb.path('comment_number', params.comment_number, {});
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

teamsGetDiscussionCommentInOrg.PATH = '/orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}';
