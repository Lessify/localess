/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { OrganizationSecretScanningAlert } from '../../models/organization-secret-scanning-alert';

export interface SecretScanningListAlertsForEnterprise$Params {

/**
 * The slug version of the enterprise name. You can also substitute this value with the enterprise id.
 */
  enterprise: string;

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
}

export function secretScanningListAlertsForEnterprise(http: HttpClient, rootUrl: string, params: SecretScanningListAlertsForEnterprise$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<OrganizationSecretScanningAlert>>> {
  const rb = new RequestBuilder(rootUrl, secretScanningListAlertsForEnterprise.PATH, 'get');
  if (params) {
    rb.path('enterprise', params.enterprise, {});
    rb.query('state', params.state, {});
    rb.query('secret_type', params.secret_type, {});
    rb.query('resolution', params.resolution, {});
    rb.query('sort', params.sort, {});
    rb.query('direction', params.direction, {});
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

secretScanningListAlertsForEnterprise.PATH = '/enterprises/{enterprise}/secret-scanning/alerts';
