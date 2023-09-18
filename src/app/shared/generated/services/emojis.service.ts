/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { BaseService } from '../base-service';
import { ApiConfiguration } from '../api-configuration';
import { StrictHttpResponse } from '../strict-http-response';

import { emojisGet } from '../fn/emojis/emojis-get';
import { EmojisGet$Params } from '../fn/emojis/emojis-get';


/**
 * List emojis available to use on GitHub.
 */
@Injectable({ providedIn: 'root' })
export class EmojisService extends BaseService {
  constructor(config: ApiConfiguration, http: HttpClient) {
    super(config, http);
  }

  /** Path part for operation `emojisGet()` */
  static readonly EmojisGetPath = '/emojis';

  /**
   * Get emojis.
   *
   * Lists all the emojis available to use on GitHub.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `emojisGet()` instead.
   *
   * This method doesn't expect any request body.
   */
  emojisGet$Response(params?: EmojisGet$Params, context?: HttpContext): Observable<StrictHttpResponse<{
[key: string]: string;
}>> {
    return emojisGet(this.http, this.rootUrl, params, context);
  }

  /**
   * Get emojis.
   *
   * Lists all the emojis available to use on GitHub.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `emojisGet$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  emojisGet(params?: EmojisGet$Params, context?: HttpContext): Observable<{
[key: string]: string;
}> {
    return this.emojisGet$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
[key: string]: string;
}>): {
[key: string]: string;
} => r.body)
    );
  }

}
