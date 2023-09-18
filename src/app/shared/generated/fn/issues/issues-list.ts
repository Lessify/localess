/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Issue } from '../../models/issue';

export interface IssuesList$Params {

/**
 * Indicates which sorts of issues to return. `assigned` means issues assigned to you. `created` means issues created by you. `mentioned` means issues mentioning you. `subscribed` means issues you're subscribed to updates for. `all` or `repos` means all issues you can see, regardless of participation or creation.
 */
  filter?: 'assigned' | 'created' | 'mentioned' | 'subscribed' | 'repos' | 'all';

/**
 * Indicates the state of the issues to return.
 */
  state?: 'open' | 'closed' | 'all';

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
  collab?: boolean;
  orgs?: boolean;
  owned?: boolean;
  pulls?: boolean;

/**
 * The number of results per page (max 100).
 */
  per_page?: number;

/**
 * Page number of the results to fetch.
 */
  page?: number;
}

export function issuesList(http: HttpClient, rootUrl: string, params?: IssuesList$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Issue>>> {
  const rb = new RequestBuilder(rootUrl, issuesList.PATH, 'get');
  if (params) {
    rb.query('filter', params.filter, {});
    rb.query('state', params.state, {});
    rb.query('labels', params.labels, {});
    rb.query('sort', params.sort, {});
    rb.query('direction', params.direction, {});
    rb.query('since', params.since, {});
    rb.query('collab', params.collab, {});
    rb.query('orgs', params.orgs, {});
    rb.query('owned', params.owned, {});
    rb.query('pulls', params.pulls, {});
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

issuesList.PATH = '/issues';
