/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { AlertNumber } from '../../models/alert-number';
import { SecretScanningAlert } from '../../models/secret-scanning-alert';
import { SecretScanningAlertResolution } from '../../models/secret-scanning-alert-resolution';
import { SecretScanningAlertResolutionComment } from '../../models/secret-scanning-alert-resolution-comment';
import { SecretScanningAlertState } from '../../models/secret-scanning-alert-state';

export interface SecretScanningUpdateAlert$Params {

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
      body: {
'state': SecretScanningAlertState;
'resolution'?: null | SecretScanningAlertResolution;
'resolution_comment'?: null | SecretScanningAlertResolutionComment;
}
}

export function secretScanningUpdateAlert(http: HttpClient, rootUrl: string, params: SecretScanningUpdateAlert$Params, context?: HttpContext): Observable<StrictHttpResponse<SecretScanningAlert>> {
  const rb = new RequestBuilder(rootUrl, secretScanningUpdateAlert.PATH, 'patch');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('alert_number', params.alert_number, {});
    rb.body(params.body, 'application/json');
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<SecretScanningAlert>;
    })
  );
}

secretScanningUpdateAlert.PATH = '/repos/{owner}/{repo}/secret-scanning/alerts/{alert_number}';
