/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { AppPermissions } from '../../models/app-permissions';
import { InstallationToken } from '../../models/installation-token';

export interface AppsCreateInstallationAccessToken$Params {

/**
 * The unique identifier of the installation.
 */
  installation_id: number;
      body?: {

/**
 * List of repository names that the token should have access to
 */
'repositories'?: Array<string>;

/**
 * List of repository IDs that the token should have access to
 */
'repository_ids'?: Array<number>;
'permissions'?: AppPermissions;
}
}

export function appsCreateInstallationAccessToken(http: HttpClient, rootUrl: string, params: AppsCreateInstallationAccessToken$Params, context?: HttpContext): Observable<StrictHttpResponse<InstallationToken>> {
  const rb = new RequestBuilder(rootUrl, appsCreateInstallationAccessToken.PATH, 'post');
  if (params) {
    rb.path('installation_id', params.installation_id, {});
    rb.body(params.body, 'application/json');
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<InstallationToken>;
    })
  );
}

appsCreateInstallationAccessToken.PATH = '/app/installations/{installation_id}/access_tokens';
