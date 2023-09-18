/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { AlertNumber } from '../../models/alert-number';
import { DependabotAlert } from '../../models/dependabot-alert';

export interface DependabotGetAlert$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

/**
 * The number that identifies a Dependabot alert in its repository.
 * You can find this at the end of the URL for a Dependabot alert within GitHub,
 * or in `number` fields in the response from the
 * `GET /repos/{owner}/{repo}/dependabot/alerts` operation.
 */
  alert_number: AlertNumber;
}

export function dependabotGetAlert(http: HttpClient, rootUrl: string, params: DependabotGetAlert$Params, context?: HttpContext): Observable<StrictHttpResponse<DependabotAlert>> {
  const rb = new RequestBuilder(rootUrl, dependabotGetAlert.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('alert_number', params.alert_number, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<DependabotAlert>;
    })
  );
}

dependabotGetAlert.PATH = '/repos/{owner}/{repo}/dependabot/alerts/{alert_number}';
