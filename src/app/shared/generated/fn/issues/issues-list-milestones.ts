/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Milestone } from '../../models/milestone';

export interface IssuesListMilestones$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

/**
 * The state of the milestone. Either `open`, `closed`, or `all`.
 */
  state?: 'open' | 'closed' | 'all';

/**
 * What to sort results by. Either `due_on` or `completeness`.
 */
  sort?: 'due_on' | 'completeness';

/**
 * The direction of the sort. Either `asc` or `desc`.
 */
  direction?: 'asc' | 'desc';

/**
 * The number of results per page (max 100).
 */
  per_page?: number;

/**
 * Page number of the results to fetch.
 */
  page?: number;
}

export function issuesListMilestones(http: HttpClient, rootUrl: string, params: IssuesListMilestones$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Milestone>>> {
  const rb = new RequestBuilder(rootUrl, issuesListMilestones.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.query('state', params.state, {});
    rb.query('sort', params.sort, {});
    rb.query('direction', params.direction, {});
    rb.query('per_page', params.per_page, {});
    rb.query('page', params.page, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Array<Milestone>>;
    })
  );
}

issuesListMilestones.PATH = '/repos/{owner}/{repo}/milestones';
