/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Package } from '../../models/package';

export interface PackagesListPackagesForAuthenticatedUser$Params {

/**
 * The type of supported package. Packages in GitHub's Gradle registry have the type `maven`. Docker images pushed to GitHub's Container registry (`ghcr.io`) have the type `container`. You can use the type `docker` to find images that were pushed to GitHub's Docker registry (`docker.pkg.github.com`), even if these have now been migrated to the Container registry.
 */
  package_type: 'npm' | 'maven' | 'rubygems' | 'docker' | 'nuget' | 'container';

/**
 * The selected visibility of the packages.  This parameter is optional and only filters an existing result set.
 *
 * The `internal` visibility is only supported for GitHub Packages registries that allow for granular permissions. For other ecosystems `internal` is synonymous with `private`.
 * For the list of GitHub Packages registries that support granular permissions, see "[About permissions for GitHub Packages](https://docs.github.com/packages/learn-github-packages/about-permissions-for-github-packages#granular-permissions-for-userorganization-scoped-packages)."
 */
  visibility?: 'public' | 'private' | 'internal';

/**
 * Page number of the results to fetch.
 */
  page?: number;

/**
 * The number of results per page (max 100).
 */
  per_page?: number;
}

export function packagesListPackagesForAuthenticatedUser(http: HttpClient, rootUrl: string, params: PackagesListPackagesForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Package>>> {
  const rb = new RequestBuilder(rootUrl, packagesListPackagesForAuthenticatedUser.PATH, 'get');
  if (params) {
    rb.query('package_type', params.package_type, {});
    rb.query('visibility', params.visibility, {});
    rb.query('page', params.page, {});
    rb.query('per_page', params.per_page, {});
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

packagesListPackagesForAuthenticatedUser.PATH = '/user/packages';
