/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { BaseService } from '../base-service';
import { ApiConfiguration } from '../api-configuration';
import { StrictHttpResponse } from '../strict-http-response';

import { License } from '../models/license';
import { LicenseContent } from '../models/license-content';
import { LicenseSimple } from '../models/license-simple';
import { licensesGet } from '../fn/licenses/licenses-get';
import { LicensesGet$Params } from '../fn/licenses/licenses-get';
import { licensesGetAllCommonlyUsed } from '../fn/licenses/licenses-get-all-commonly-used';
import { LicensesGetAllCommonlyUsed$Params } from '../fn/licenses/licenses-get-all-commonly-used';
import { licensesGetForRepo } from '../fn/licenses/licenses-get-for-repo';
import { LicensesGetForRepo$Params } from '../fn/licenses/licenses-get-for-repo';


/**
 * View various OSS licenses.
 */
@Injectable({ providedIn: 'root' })
export class LicensesService extends BaseService {
  constructor(config: ApiConfiguration, http: HttpClient) {
    super(config, http);
  }

  /** Path part for operation `licensesGetAllCommonlyUsed()` */
  static readonly LicensesGetAllCommonlyUsedPath = '/licenses';

  /**
   * Get all commonly used licenses.
   *
   * Lists the most commonly used licenses on GitHub. For more information, see "[Licensing a repository ](https://docs.github.com/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository)."
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `licensesGetAllCommonlyUsed()` instead.
   *
   * This method doesn't expect any request body.
   */
  licensesGetAllCommonlyUsed$Response(params?: LicensesGetAllCommonlyUsed$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<LicenseSimple>>> {
    return licensesGetAllCommonlyUsed(this.http, this.rootUrl, params, context);
  }

  /**
   * Get all commonly used licenses.
   *
   * Lists the most commonly used licenses on GitHub. For more information, see "[Licensing a repository ](https://docs.github.com/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository)."
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `licensesGetAllCommonlyUsed$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  licensesGetAllCommonlyUsed(params?: LicensesGetAllCommonlyUsed$Params, context?: HttpContext): Observable<Array<LicenseSimple>> {
    return this.licensesGetAllCommonlyUsed$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<LicenseSimple>>): Array<LicenseSimple> => r.body)
    );
  }

  /** Path part for operation `licensesGet()` */
  static readonly LicensesGetPath = '/licenses/{license}';

  /**
   * Get a license.
   *
   * Gets information about a specific license. For more information, see "[Licensing a repository ](https://docs.github.com/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository)."
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `licensesGet()` instead.
   *
   * This method doesn't expect any request body.
   */
  licensesGet$Response(params: LicensesGet$Params, context?: HttpContext): Observable<StrictHttpResponse<License>> {
    return licensesGet(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a license.
   *
   * Gets information about a specific license. For more information, see "[Licensing a repository ](https://docs.github.com/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository)."
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `licensesGet$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  licensesGet(params: LicensesGet$Params, context?: HttpContext): Observable<License> {
    return this.licensesGet$Response(params, context).pipe(
      map((r: StrictHttpResponse<License>): License => r.body)
    );
  }

  /** Path part for operation `licensesGetForRepo()` */
  static readonly LicensesGetForRepoPath = '/repos/{owner}/{repo}/license';

  /**
   * Get the license for a repository.
   *
   * This method returns the contents of the repository's license file, if one is detected.
   *
   * Similar to [Get repository content](https://docs.github.com/rest/repos/contents#get-repository-content), this method also supports [custom media types](https://docs.github.com/rest/overview/media-types) for retrieving the raw license content or rendered license HTML.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `licensesGetForRepo()` instead.
   *
   * This method doesn't expect any request body.
   */
  licensesGetForRepo$Response(params: LicensesGetForRepo$Params, context?: HttpContext): Observable<StrictHttpResponse<LicenseContent>> {
    return licensesGetForRepo(this.http, this.rootUrl, params, context);
  }

  /**
   * Get the license for a repository.
   *
   * This method returns the contents of the repository's license file, if one is detected.
   *
   * Similar to [Get repository content](https://docs.github.com/rest/repos/contents#get-repository-content), this method also supports [custom media types](https://docs.github.com/rest/overview/media-types) for retrieving the raw license content or rendered license HTML.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `licensesGetForRepo$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  licensesGetForRepo(params: LicensesGetForRepo$Params, context?: HttpContext): Observable<LicenseContent> {
    return this.licensesGetForRepo$Response(params, context).pipe(
      map((r: StrictHttpResponse<LicenseContent>): LicenseContent => r.body)
    );
  }

}
