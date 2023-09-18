/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { AlertNumber } from '../../models/alert-number';
import { SecretScanningLocation } from '../../models/secret-scanning-location';

export interface SecretScanningListLocationsForAlert$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

/**
 * The number that identifies an alert. You can find this at the end of the URL for a code scanning alert within GitHub, and in the `number` field in the response from the `GET /repos/{owner}/{repo}/code-scanning/alerts` operation.
 */
  alert_number: AlertNumber;

/**
 * Page number of the results to fetch.
 */
  page?: number;

/**
 * The number of results per page (max 100).
 */
  per_page?: number;
}

export function secretScanningListLocationsForAlert(http: HttpClient, rootUrl: string, params: SecretScanningListLocationsForAlert$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<SecretScanningLocation>>> {
  const rb = new RequestBuilder(rootUrl, secretScanningListLocationsForAlert.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('alert_number', params.alert_number, {});
    rb.query('page', params.page, {});
    rb.query('per_page', params.per_page, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Array<SecretScanningLocation>>;
    })
  );
}

secretScanningListLocationsForAlert.PATH = '/repos/{owner}/{repo}/secret-scanning/alerts/{alert_number}/locations';
