/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { DependabotAlert } from '../../models/dependabot-alert';

export interface DependabotListAlertsForRepo$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

/**
 * A comma-separated list of states. If specified, only alerts with these states will be returned.
 *
 * Can be: `auto_dismissed`, `dismissed`, `fixed`, `open`
 */
  state?: string;

/**
 * A comma-separated list of severities. If specified, only alerts with these severities will be returned.
 *
 * Can be: `low`, `medium`, `high`, `critical`
 */
  severity?: string;

/**
 * A comma-separated list of ecosystems. If specified, only alerts for these ecosystems will be returned.
 *
 * Can be: `composer`, `go`, `maven`, `npm`, `nuget`, `pip`, `pub`, `rubygems`, `rust`
 */
  ecosystem?: string;

/**
 * A comma-separated list of package names. If specified, only alerts for these packages will be returned.
 */
  package?: string;

/**
 * A comma-separated list of full manifest paths. If specified, only alerts for these manifests will be returned.
 */
  manifest?: string;

/**
 * The scope of the vulnerable dependency. If specified, only alerts with this scope will be returned.
 */
  scope?: 'development' | 'runtime';

/**
 * The property by which to sort the results.
 * `created` means when the alert was created.
 * `updated` means when the alert's state last changed.
 */
  sort?: 'created' | 'updated';

/**
 * The direction to sort the results by.
 */
  direction?: 'asc' | 'desc';

/**
 * **Deprecated**. Page number of the results to fetch. Use cursor-based pagination with `before` or `after` instead.
 *
 * @deprecated
 */
  page?: number;

/**
 * The number of results per page (max 100).
 *
 * @deprecated
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
 * **Deprecated**. The number of results per page (max 100), starting from the first matching result.
 * This parameter must not be used in combination with `last`.
 * Instead, use `per_page` in combination with `after` to fetch the first page of results.
 */
  first?: number;

/**
 * **Deprecated**. The number of results per page (max 100), starting from the last matching result.
 * This parameter must not be used in combination with `first`.
 * Instead, use `per_page` in combination with `before` to fetch the last page of results.
 */
  last?: number;
}

export function dependabotListAlertsForRepo(http: HttpClient, rootUrl: string, params: DependabotListAlertsForRepo$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<DependabotAlert>>> {
  const rb = new RequestBuilder(rootUrl, dependabotListAlertsForRepo.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.query('state', params.state, {});
    rb.query('severity', params.severity, {});
    rb.query('ecosystem', params.ecosystem, {});
    rb.query('package', params.package, {});
    rb.query('manifest', params.manifest, {});
    rb.query('scope', params.scope, {});
    rb.query('sort', params.sort, {});
    rb.query('direction', params.direction, {});
    rb.query('page', params.page, {});
    rb.query('per_page', params.per_page, {});
    rb.query('before', params.before, {});
    rb.query('after', params.after, {});
    rb.query('first', params.first, {});
    rb.query('last', params.last, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Array<DependabotAlert>>;
    })
  );
}

dependabotListAlertsForRepo.PATH = '/repos/{owner}/{repo}/dependabot/alerts';
