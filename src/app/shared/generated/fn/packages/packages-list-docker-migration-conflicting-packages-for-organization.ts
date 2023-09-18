/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Package } from '../../models/package';

export interface PackagesListDockerMigrationConflictingPackagesForOrganization$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;
}

export function packagesListDockerMigrationConflictingPackagesForOrganization(http: HttpClient, rootUrl: string, params: PackagesListDockerMigrationConflictingPackagesForOrganization$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Package>>> {
  const rb = new RequestBuilder(rootUrl, packagesListDockerMigrationConflictingPackagesForOrganization.PATH, 'get');
  if (params) {
    rb.path('org', params.org, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Array<Package>>;
    })
  );
}

packagesListDockerMigrationConflictingPackagesForOrganization.PATH = '/orgs/{org}/docker/conflicts';
