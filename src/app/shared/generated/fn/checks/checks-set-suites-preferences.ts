/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { CheckSuitePreference } from '../../models/check-suite-preference';

export interface ChecksSetSuitesPreferences$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;
      body: {

/**
 * Enables or disables automatic creation of CheckSuite events upon pushes to the repository. Enabled by default.
 */
'auto_trigger_checks'?: Array<{

/**
 * The `id` of the GitHub App.
 */
'app_id': number;

/**
 * Set to `true` to enable automatic creation of CheckSuite events upon pushes to the repository, or `false` to disable them.
 */
'setting': boolean;
}>;
}
}

export function checksSetSuitesPreferences(http: HttpClient, rootUrl: string, params: ChecksSetSuitesPreferences$Params, context?: HttpContext): Observable<StrictHttpResponse<CheckSuitePreference>> {
  const rb = new RequestBuilder(rootUrl, checksSetSuitesPreferences.PATH, 'patch');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.body(params.body, 'application/json');
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<CheckSuitePreference>;
    })
  );
}

checksSetSuitesPreferences.PATH = '/repos/{owner}/{repo}/check-suites/preferences';
