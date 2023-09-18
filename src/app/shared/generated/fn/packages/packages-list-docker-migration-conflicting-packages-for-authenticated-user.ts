/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Package } from '../../models/package';

export interface PackagesListDockerMigrationConflictingPackagesForAuthenticatedUser$Params {
}

export function packagesListDockerMigrationConflictingPackagesForAuthenticatedUser(http: HttpClient, rootUrl: string, params?: PackagesListDockerMigrationConflictingPackagesForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Package>>> {
  const rb = new RequestBuilder(rootUrl, packagesListDockerMigrationConflictingPackagesForAuthenticatedUser.PATH, 'get');
  if (params) {
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

packagesListDockerMigrationConflictingPackagesForAuthenticatedUser.PATH = '/user/docker/conflicts';
