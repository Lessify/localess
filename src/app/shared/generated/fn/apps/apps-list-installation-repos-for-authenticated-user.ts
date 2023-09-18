/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Repository } from '../../models/repository';

export interface AppsListInstallationReposForAuthenticatedUser$Params {

/**
 * The unique identifier of the installation.
 */
  installation_id: number;

/**
 * The number of results per page (max 100).
 */
  per_page?: number;

/**
 * Page number of the results to fetch.
 */
  page?: number;
}

export function appsListInstallationReposForAuthenticatedUser(http: HttpClient, rootUrl: string, params: AppsListInstallationReposForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'repository_selection'?: string;
'repositories': Array<Repository>;
}>> {
  const rb = new RequestBuilder(rootUrl, appsListInstallationReposForAuthenticatedUser.PATH, 'get');
  if (params) {
    rb.path('installation_id', params.installation_id, {});
    rb.query('per_page', params.per_page, {});
    rb.query('page', params.page, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<{
      'total_count': number;
      'repository_selection'?: string;
      'repositories': Array<Repository>;
      }>;
    })
  );
}

appsListInstallationReposForAuthenticatedUser.PATH = '/user/installations/{installation_id}/repositories';
