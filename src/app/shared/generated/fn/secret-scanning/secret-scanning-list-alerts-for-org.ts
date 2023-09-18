/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { OrganizationSecretScanningAlert } from '../../models/organization-secret-scanning-alert';

export interface SecretScanningListAlertsForOrg$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;

/**
 * Set to `open` or `resolved` to only list secret scanning alerts in a specific state.
 */
  state?: 'open' | 'resolved';

/**
 * A comma-separated list of secret types to return. By default all secret types are returned.
 * See "[Secret scanning patterns](https://docs.github.com/code-security/secret-scanning/secret-scanning-patterns#supported-secrets-for-advanced-security)"
 * for a complete list of secret types.
 */
  secret_type?: string;

/**
 * A comma-separated list of resolutions. Only secret scanning alerts with one of these resolutions are listed. Valid resolutions are `false_positive`, `wont_fix`, `revoked`, `pattern_edited`, `pattern_deleted` or `used_in_tests`.
 */
  resolution?: string;

/**
 * The property to sort the results by. `created` means when the alert was created. `updated` means when the alert was updated or resolved.
 */
  sort?: 'created' | 'updated';

/**
 * The direction to sort the results by.
 */
  direction?: 'asc' | 'desc';

/**
 * Page number of the results to fetch.
 */
  page?: number;

/**
 * The number of results per page (max 100).
 */
  per_page?: number;

/**
 * A cursor, as given in the [Link header](https://docs.github.com/rest/guides/using-pagination-in-the-rest-api#using-link-headers). If specified, the query only searches for events before this cursor. To receive an initial cursor on your first request, include an empty "before" query string.
 */
  before?: string;

/**
 * A cursor, as given in the [Link header](https://docs.github.com/rest/guides/using-pagination-in-the-rest-api#using-link-headers). If specified, the query only searches for events after this cursor.  To receive an initial cursor on your first request, include an empty "after" query string.
 */
  after?: string;
}

export function secretScanningListAlertsForOrg(http: HttpClient, rootUrl: string, params: SecretScanningListAlertsForOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<OrganizationSecretScanningAlert>>> {
  const rb = new RequestBuilder(rootUrl, secretScanningListAlertsForOrg.PATH, 'get');
  if (params) {
    rb.path('org', params.org, {});
    rb.query('state', params.state, {});
    rb.query('secret_type', params.secret_type, {});
    rb.query('resolution', params.resolution, {});
    rb.query('sort', params.sort, {});
    rb.query('direction', params.direction, {});
    rb.query('page', params.page, {});
    rb.query('per_page', params.per_page, {});
    rb.query('before', params.before, {});
    rb.query('after', params.after, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Array<OrganizationSecretScanningAlert>>;
    })
  );
}

secretScanningListAlertsForOrg.PATH = '/orgs/{org}/secret-scanning/alerts';
