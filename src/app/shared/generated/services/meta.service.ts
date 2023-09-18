/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { BaseService } from '../base-service';
import { ApiConfiguration } from '../api-configuration';
import { StrictHttpResponse } from '../strict-http-response';

import { ApiOverview } from '../models/api-overview';
import { metaGet } from '../fn/meta/meta-get';
import { MetaGet$Params } from '../fn/meta/meta-get';
import { metaGetAllVersions } from '../fn/meta/meta-get-all-versions';
import { MetaGetAllVersions$Params } from '../fn/meta/meta-get-all-versions';
import { metaGetOctocat } from '../fn/meta/meta-get-octocat';
import { MetaGetOctocat$Params } from '../fn/meta/meta-get-octocat';
import { metaGetZen } from '../fn/meta/meta-get-zen';
import { MetaGetZen$Params } from '../fn/meta/meta-get-zen';
import { metaRoot } from '../fn/meta/meta-root';
import { MetaRoot$Params } from '../fn/meta/meta-root';
import { Root } from '../models/root';


/**
 * Endpoints that give information about the API.
 */
@Injectable({ providedIn: 'root' })
export class MetaService extends BaseService {
  constructor(config: ApiConfiguration, http: HttpClient) {
    super(config, http);
  }

  /** Path part for operation `metaRoot()` */
  static readonly MetaRootPath = '/';

  /**
   * GitHub API Root.
   *
   * Get Hypermedia links to resources accessible in GitHub's REST API
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `metaRoot()` instead.
   *
   * This method doesn't expect any request body.
   */
  metaRoot$Response(params?: MetaRoot$Params, context?: HttpContext): Observable<StrictHttpResponse<Root>> {
    return metaRoot(this.http, this.rootUrl, params, context);
  }

  /**
   * GitHub API Root.
   *
   * Get Hypermedia links to resources accessible in GitHub's REST API
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `metaRoot$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  metaRoot(params?: MetaRoot$Params, context?: HttpContext): Observable<Root> {
    return this.metaRoot$Response(params, context).pipe(
      map((r: StrictHttpResponse<Root>): Root => r.body)
    );
  }

  /** Path part for operation `metaGet()` */
  static readonly MetaGetPath = '/meta';

  /**
   * Get GitHub meta information.
   *
   * Returns meta information about GitHub, including a list of GitHub's IP addresses. For more information, see "[About GitHub's IP addresses](https://docs.github.com/articles/about-github-s-ip-addresses/)."
   *
   * The API's response also includes a list of GitHub's domain names.
   *
   * The values shown in the documentation's response are example values. You must always query the API directly to get the latest values.
   *
   * **Note:** This endpoint returns both IPv4 and IPv6 addresses. However, not all features support IPv6. You should refer to the specific documentation for each feature to determine if IPv6 is supported.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `metaGet()` instead.
   *
   * This method doesn't expect any request body.
   */
  metaGet$Response(params?: MetaGet$Params, context?: HttpContext): Observable<StrictHttpResponse<ApiOverview>> {
    return metaGet(this.http, this.rootUrl, params, context);
  }

  /**
   * Get GitHub meta information.
   *
   * Returns meta information about GitHub, including a list of GitHub's IP addresses. For more information, see "[About GitHub's IP addresses](https://docs.github.com/articles/about-github-s-ip-addresses/)."
   *
   * The API's response also includes a list of GitHub's domain names.
   *
   * The values shown in the documentation's response are example values. You must always query the API directly to get the latest values.
   *
   * **Note:** This endpoint returns both IPv4 and IPv6 addresses. However, not all features support IPv6. You should refer to the specific documentation for each feature to determine if IPv6 is supported.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `metaGet$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  metaGet(params?: MetaGet$Params, context?: HttpContext): Observable<ApiOverview> {
    return this.metaGet$Response(params, context).pipe(
      map((r: StrictHttpResponse<ApiOverview>): ApiOverview => r.body)
    );
  }

  /** Path part for operation `metaGetOctocat()` */
  static readonly MetaGetOctocatPath = '/octocat';

  /**
   * Get Octocat.
   *
   * Get the octocat as ASCII art
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `metaGetOctocat()` instead.
   *
   * This method doesn't expect any request body.
   */
  metaGetOctocat$Response(params?: MetaGetOctocat$Params, context?: HttpContext): Observable<StrictHttpResponse<string>> {
    return metaGetOctocat(this.http, this.rootUrl, params, context);
  }

  /**
   * Get Octocat.
   *
   * Get the octocat as ASCII art
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `metaGetOctocat$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  metaGetOctocat(params?: MetaGetOctocat$Params, context?: HttpContext): Observable<string> {
    return this.metaGetOctocat$Response(params, context).pipe(
      map((r: StrictHttpResponse<string>): string => r.body)
    );
  }

  /** Path part for operation `metaGetAllVersions()` */
  static readonly MetaGetAllVersionsPath = '/versions';

  /**
   * Get all API versions.
   *
   * Get all supported GitHub API versions.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `metaGetAllVersions()` instead.
   *
   * This method doesn't expect any request body.
   */
  metaGetAllVersions$Response(params?: MetaGetAllVersions$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<string>>> {
    return metaGetAllVersions(this.http, this.rootUrl, params, context);
  }

  /**
   * Get all API versions.
   *
   * Get all supported GitHub API versions.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `metaGetAllVersions$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  metaGetAllVersions(params?: MetaGetAllVersions$Params, context?: HttpContext): Observable<Array<string>> {
    return this.metaGetAllVersions$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<string>>): Array<string> => r.body)
    );
  }

  /** Path part for operation `metaGetZen()` */
  static readonly MetaGetZenPath = '/zen';

  /**
   * Get the Zen of GitHub.
   *
   * Get a random sentence from the Zen of GitHub
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `metaGetZen()` instead.
   *
   * This method doesn't expect any request body.
   */
  metaGetZen$Response(params?: MetaGetZen$Params, context?: HttpContext): Observable<StrictHttpResponse<string>> {
    return metaGetZen(this.http, this.rootUrl, params, context);
  }

  /**
   * Get the Zen of GitHub.
   *
   * Get a random sentence from the Zen of GitHub
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `metaGetZen$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  metaGetZen(params?: MetaGetZen$Params, context?: HttpContext): Observable<string> {
    return this.metaGetZen$Response(params, context).pipe(
      map((r: StrictHttpResponse<string>): string => r.body)
    );
  }

}
