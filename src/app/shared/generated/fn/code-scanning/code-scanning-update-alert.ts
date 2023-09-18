/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { AlertNumber } from '../../models/alert-number';
import { CodeScanningAlert } from '../../models/code-scanning-alert';
import { CodeScanningAlertDismissedComment } from '../../models/code-scanning-alert-dismissed-comment';
import { CodeScanningAlertDismissedReason } from '../../models/code-scanning-alert-dismissed-reason';
import { CodeScanningAlertSetState } from '../../models/code-scanning-alert-set-state';

export interface CodeScanningUpdateAlert$Params {

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
'state': CodeScanningAlertSetState;
'dismissed_reason'?: null | CodeScanningAlertDismissedReason;
'dismissed_comment'?: null | CodeScanningAlertDismissedComment;
}
}

export function codeScanningUpdateAlert(http: HttpClient, rootUrl: string, params: CodeScanningUpdateAlert$Params, context?: HttpContext): Observable<StrictHttpResponse<CodeScanningAlert>> {
  const rb = new RequestBuilder(rootUrl, codeScanningUpdateAlert.PATH, 'patch');
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
      return r as StrictHttpResponse<CodeScanningAlert>;
    })
  );
}

codeScanningUpdateAlert.PATH = '/repos/{owner}/{repo}/code-scanning/alerts/{alert_number}';
