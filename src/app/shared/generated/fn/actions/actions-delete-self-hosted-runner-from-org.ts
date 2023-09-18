/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';


export interface ActionsDeleteSelfHostedRunnerFromOrg$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;

/**
 * Unique identifier of the self-hosted runner.
 */
  runner_id: number;
}

export function actionsDeleteSelfHostedRunnerFromOrg(http: HttpClient, rootUrl: string, params: ActionsDeleteSelfHostedRunnerFromOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
  const rb = new RequestBuilder(rootUrl, actionsDeleteSelfHostedRunnerFromOrg.PATH, 'delete');
  if (params) {
    rb.path('org', params.org, {});
    rb.path('runner_id', params.runner_id, {});
  }

  return http.request(
    rb.build({ responseType: 'text', accept: '*/*', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return (r as HttpResponse<any>).clone({ body: undefined }) as StrictHttpResponse<void>;
    })
  );
}

actionsDeleteSelfHostedRunnerFromOrg.PATH = '/orgs/{org}/actions/runners/{runner_id}';
