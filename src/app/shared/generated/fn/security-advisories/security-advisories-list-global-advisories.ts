/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { GlobalAdvisory } from '../../models/global-advisory';

export interface SecurityAdvisoriesListGlobalAdvisories$Params {

/**
 * If specified, only advisories with this GHSA (GitHub Security Advisory) identifier will be returned.
 */
  ghsa_id?: string;

/**
 * If specified, only advisories of this type will be returned. By default, a request with no other parameters defined will only return reviewed advisories that are not malware.
 */
  type?: 'reviewed' | 'malware' | 'unreviewed';

/**
 * If specified, only advisories with this CVE (Common Vulnerabilities and Exposures) identifier will be returned.
 */
  cve_id?: string;

/**
 * If specified, only advisories for these ecosystems will be returned.
 */
  ecosystem?: 'actions' | 'composer' | 'erlang' | 'go' | 'maven' | 'npm' | 'nuget' | 'other' | 'pip' | 'pub' | 'rubygems' | 'rust';

/**
 * If specified, only advisories with these severities will be returned.
 */
  severity?: 'unknown' | 'low' | 'medium' | 'high' | 'critical';

/**
 * If specified, only advisories with these Common Weakness Enumerations (CWEs) will be returned.
 *
 * Example: `cwes=79,284,22` or `cwes[]=79&cwes[]=284&cwes[]=22`
 */
  cwes?: (string | Array<string>);

/**
 * Whether to only return advisories that have been withdrawn.
 */
  is_withdrawn?: boolean;

/**
 * If specified, only return advisories that affect any of `package` or `package@version`. A maximum of 1000 packages can be specified.
 * If the query parameter causes the URL to exceed the maximum URL length supported by your client, you must specify fewer packages.
 *
 * Example: `affects=package1,package2@1.0.0,package3@^2.0.0` or `affects[]=package1&affects[]=package2@1.0.0`
 */
  affects?: (string | Array<string>);

/**
 * If specified, only return advisories that were published on a date or date range.
 *
 * For more information on the syntax of the date range, see "[Understanding the search syntax](https://docs.github.com/search-github/getting-started-with-searching-on-github/understanding-the-search-syntax#query-for-dates)."
 */
  published?: string;

/**
 * If specified, only return advisories that were updated on a date or date range.
 *
 * For more information on the syntax of the date range, see "[Understanding the search syntax](https://docs.github.com/search-github/getting-started-with-searching-on-github/understanding-the-search-syntax#query-for-dates)."
 */
  updated?: string;

/**
 * If specified, only show advisories that were updated or published on a date or date range.
 *
 * For more information on the syntax of the date range, see "[Understanding the search syntax](https://docs.github.com/search-github/getting-started-with-searching-on-github/understanding-the-search-syntax#query-for-dates)."
 */
  modified?: string;

/**
 * A cursor, as given in the [Link header](https://docs.github.com/rest/guides/using-pagination-in-the-rest-api#using-link-headers). If specified, the query only searches for results before this cursor.
 */
  before?: string;

/**
 * A cursor, as given in the [Link header](https://docs.github.com/rest/guides/using-pagination-in-the-rest-api#using-link-headers). If specified, the query only searches for results after this cursor.
 */
  after?: string;

/**
 * The direction to sort the results by.
 */
  direction?: 'asc' | 'desc';

/**
 * The number of results per page (max 100).
 */
  per_page?: number;

/**
 * The property to sort the results by.
 */
  sort?: 'updated' | 'published';
}

export function securityAdvisoriesListGlobalAdvisories(http: HttpClient, rootUrl: string, params?: SecurityAdvisoriesListGlobalAdvisories$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<GlobalAdvisory>>> {
  const rb = new RequestBuilder(rootUrl, securityAdvisoriesListGlobalAdvisories.PATH, 'get');
  if (params) {
    rb.query('ghsa_id', params.ghsa_id, {});
    rb.query('type', params.type, {});
    rb.query('cve_id', params.cve_id, {});
    rb.query('ecosystem', params.ecosystem, {});
    rb.query('severity', params.severity, {});
    rb.query('cwes', params.cwes, {});
    rb.query('is_withdrawn', params.is_withdrawn, {});
    rb.query('affects', params.affects, {});
    rb.query('published', params.published, {});
    rb.query('updated', params.updated, {});
    rb.query('modified', params.modified, {});
    rb.query('before', params.before, {});
    rb.query('after', params.after, {});
    rb.query('direction', params.direction, {});
    rb.query('per_page', params.per_page, {});
    rb.query('sort', params.sort, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Array<GlobalAdvisory>>;
    })
  );
}

securityAdvisoriesListGlobalAdvisories.PATH = '/advisories';
