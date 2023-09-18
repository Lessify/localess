/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { RepositoryAdvisory } from '../../models/repository-advisory';

export interface SecurityAdvisoriesListRepositoryAdvisories$Params {

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
 * The property to sort the results by.
 */
  sort?: 'created' | 'updated' | 'published';

/**
 * A cursor, as given in the [Link header](https://docs.github.com/rest/guides/using-pagination-in-the-rest-api#using-link-headers). If specified, the query only searches for results before this cursor.
 */
  before?: string;

/**
 * A cursor, as given in the [Link header](https://docs.github.com/rest/guides/using-pagination-in-the-rest-api#using-link-headers). If specified, the query only searches for results after this cursor.
 */
  after?: string;

/**
 * Number of advisories to return per page.
 */
  per_page?: number;

/**
 * Filter by state of the repository advisories. Only advisories of this state will be returned.
 */
  state?: 'triage' | 'draft' | 'published' | 'closed';
}

export function securityAdvisoriesListRepositoryAdvisories(http: HttpClient, rootUrl: string, params: SecurityAdvisoriesListRepositoryAdvisories$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<RepositoryAdvisory>>> {
  const rb = new RequestBuilder(rootUrl, securityAdvisoriesListRepositoryAdvisories.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.query('direction', params.direction, {});
    rb.query('sort', params.sort, {});
    rb.query('before', params.before, {});
    rb.query('after', params.after, {});
    rb.query('per_page', params.per_page, {});
    rb.query('state', params.state, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Array<RepositoryAdvisory>>;
    })
  );
}

securityAdvisoriesListRepositoryAdvisories.PATH = '/repos/{owner}/{repo}/security-advisories';
