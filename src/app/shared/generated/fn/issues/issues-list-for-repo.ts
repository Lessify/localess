/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Issue } from '../../models/issue';

export interface IssuesListForRepo$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

/**
 * If an `integer` is passed, it should refer to a milestone by its `number` field. If the string `*` is passed, issues with any milestone are accepted. If the string `none` is passed, issues without milestones are returned.
 */
  milestone?: string;

/**
 * Indicates the state of the issues to return.
 */
  state?: 'open' | 'closed' | 'all';

/**
 * Can be the name of a user. Pass in `none` for issues with no assigned user, and `*` for issues assigned to any user.
 */
  assignee?: string;

/**
 * The user that created the issue.
 */
  creator?: string;

/**
 * A user that's mentioned in the issue.
 */
  mentioned?: string;

/**
 * A list of comma separated label names. Example: `bug,ui,@high`
 */
  labels?: string;

/**
 * What to sort results by.
 */
  sort?: 'created' | 'updated' | 'comments';

/**
 * The direction to sort the results by.
 */
  direction?: 'asc' | 'desc';

/**
 * Only show results that were last updated after the given time. This is a timestamp in [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) format: `YYYY-MM-DDTHH:MM:SSZ`.
 */
  since?: string;

/**
 * The number of results per page (max 100).
 */
  per_page?: number;

/**
 * Page number of the results to fetch.
 */
  page?: number;
}

export function issuesListForRepo(http: HttpClient, rootUrl: string, params: IssuesListForRepo$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Issue>>> {
  const rb = new RequestBuilder(rootUrl, issuesListForRepo.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.query('milestone', params.milestone, {});
    rb.query('state', params.state, {});
    rb.query('assignee', params.assignee, {});
    rb.query('creator', params.creator, {});
    rb.query('mentioned', params.mentioned, {});
    rb.query('labels', params.labels, {});
    rb.query('sort', params.sort, {});
    rb.query('direction', params.direction, {});
    rb.query('since', params.since, {});
    rb.query('per_page', params.per_page, {});
    rb.query('page', params.page, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Array<Issue>>;
    })
  );
}

issuesListForRepo.PATH = '/repos/{owner}/{repo}/issues';
