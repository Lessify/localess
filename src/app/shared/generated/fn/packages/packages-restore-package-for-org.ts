/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';


export interface PackagesRestorePackageForOrg$Params {

/**
 * The type of supported package. Packages in GitHub's Gradle registry have the type `maven`. Docker images pushed to GitHub's Container registry (`ghcr.io`) have the type `container`. You can use the type `docker` to find images that were pushed to GitHub's Docker registry (`docker.pkg.github.com`), even if these have now been migrated to the Container registry.
 */
  package_type: 'npm' | 'maven' | 'rubygems' | 'docker' | 'nuget' | 'container';

/**
 * The name of the package.
 */
  package_name: string;

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;

/**
 * package token
 */
  token?: string;
}

export function packagesRestorePackageForOrg(http: HttpClient, rootUrl: string, params: PackagesRestorePackageForOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
  const rb = new RequestBuilder(rootUrl, packagesRestorePackageForOrg.PATH, 'post');
  if (params) {
    rb.path('package_type', params.package_type, {});
    rb.path('package_name', params.package_name, {});
    rb.path('org', params.org, {});
    rb.query('token', params.token, {});
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

packagesRestorePackageForOrg.PATH = '/orgs/{org}/packages/{package_type}/{package_name}/restore';
