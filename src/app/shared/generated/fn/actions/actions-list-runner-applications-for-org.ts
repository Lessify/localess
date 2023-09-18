/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { RunnerApplication } from '../../models/runner-application';

export interface ActionsListRunnerApplicationsForOrg$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;
}

export function actionsListRunnerApplicationsForOrg(http: HttpClient, rootUrl: string, params: ActionsListRunnerApplicationsForOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<RunnerApplication>>> {
  const rb = new RequestBuilder(rootUrl, actionsListRunnerApplicationsForOrg.PATH, 'get');
  if (params) {
    rb.path('org', params.org, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Array<RunnerApplication>>;
    })
  );
}

actionsListRunnerApplicationsForOrg.PATH = '/orgs/{org}/actions/runners/downloads';
