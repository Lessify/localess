/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { RepositoryAdvisory } from '../../models/repository-advisory';

export interface SecurityAdvisoriesListOrgRepositoryAdvisories$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;

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
 * The number of advisories to return per page.
 */
  per_page?: number;

/**
 * Filter by the state of the repository advisories. Only advisories of this state will be returned.
 */
  state?: 'triage' | 'draft' | 'published' | 'closed';
}

export function securityAdvisoriesListOrgRepositoryAdvisories(http: HttpClient, rootUrl: string, params: SecurityAdvisoriesListOrgRepositoryAdvisories$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<RepositoryAdvisory>>> {
  const rb = new RequestBuilder(rootUrl, securityAdvisoriesListOrgRepositoryAdvisories.PATH, 'get');
  if (params) {
    rb.path('org', params.org, {});
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

securityAdvisoriesListOrgRepositoryAdvisories.PATH = '/orgs/{org}/security-advisories';
