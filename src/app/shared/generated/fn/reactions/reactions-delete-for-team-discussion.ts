/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';


export interface ReactionsDeleteForTeamDiscussion$Params {

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
 * The unique identifier of the reaction.
 */
  reaction_id: number;
}

export function reactionsDeleteForTeamDiscussion(http: HttpClient, rootUrl: string, params: ReactionsDeleteForTeamDiscussion$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
  const rb = new RequestBuilder(rootUrl, reactionsDeleteForTeamDiscussion.PATH, 'delete');
  if (params) {
    rb.path('org', params.org, {});
    rb.path('team_slug', params.team_slug, {});
    rb.path('discussion_number', params.discussion_number, {});
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

reactionsDeleteForTeamDiscussion.PATH = '/orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/reactions/{reaction_id}';
