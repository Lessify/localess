/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Activity } from '../../models/activity';

export interface ReposListActivities$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

/**
 * The direction to sort the results by.
 */
  direction?: 'asc' | 'desc';

/**
 * The number of results per page (max 100).
 */
  per_page?: number;

/**
 * A cursor, as given in the [Link header](https://docs.github.com/rest/guides/using-pagination-in-the-rest-api#using-link-headers). If specified, the query only searches for results before this cursor.
 */
  before?: string;

/**
 * A cursor, as given in the [Link header](https://docs.github.com/rest/guides/using-pagination-in-the-rest-api#using-link-headers). If specified, the query only searches for results after this cursor.
 */
  after?: string;

/**
 * The Git reference for the activities you want to list.
 *
 * The `ref` for a branch can be formatted either as `refs/heads/BRANCH_NAME` or `BRANCH_NAME`, where `BRANCH_NAME` is the name of your branch.
 */
  ref?: string;

/**
 * The GitHub username to use to filter by the actor who performed the activity.
 */
  actor?: string;

/**
 * The time period to filter by.
 *
 * For example, `day` will filter for activity that occurred in the past 24 hours, and `week` will filter for activity that occurred in the past 7 days (168 hours).
 */
  time_period?: 'day' | 'week' | 'month' | 'quarter' | 'year';

/**
 * The activity type to filter by.
 *
 * For example, you can choose to filter by "force_push", to see all force pushes to the repository.
 */
  activity_type?: 'push' | 'force_push' | 'branch_creation' | 'branch_deletion' | 'pr_merge' | 'merge_queue_merge';
}

export function reposListActivities(http: HttpClient, rootUrl: string, params: ReposListActivities$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Activity>>> {
  const rb = new RequestBuilder(rootUrl, reposListActivities.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.query('direction', params.direction, {});
    rb.query('per_page', params.per_page, {});
    rb.query('before', params.before, {});
    rb.query('after', params.after, {});
    rb.query('ref', params.ref, {});
    rb.query('actor', params.actor, {});
    rb.query('time_period', params.time_period, {});
    rb.query('activity_type', params.activity_type, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Array<Activity>>;
    })
  );
}

reposListActivities.PATH = '/repos/{owner}/{repo}/activity';
