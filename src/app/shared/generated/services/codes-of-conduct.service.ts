/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { BaseService } from '../base-service';
import { ApiConfiguration } from '../api-configuration';
import { StrictHttpResponse } from '../strict-http-response';

import { CodeOfConduct } from '../models/code-of-conduct';
import { codesOfConductGetAllCodesOfConduct } from '../fn/codes-of-conduct/codes-of-conduct-get-all-codes-of-conduct';
import { CodesOfConductGetAllCodesOfConduct$Params } from '../fn/codes-of-conduct/codes-of-conduct-get-all-codes-of-conduct';
import { codesOfConductGetConductCode } from '../fn/codes-of-conduct/codes-of-conduct-get-conduct-code';
import { CodesOfConductGetConductCode$Params } from '../fn/codes-of-conduct/codes-of-conduct-get-conduct-code';


/**
 * Insight into codes of conduct for your communities.
 */
@Injectable({ providedIn: 'root' })
export class CodesOfConductService extends BaseService {
  constructor(config: ApiConfiguration, http: HttpClient) {
    super(config, http);
  }

  /** Path part for operation `codesOfConductGetAllCodesOfConduct()` */
  static readonly CodesOfConductGetAllCodesOfConductPath = '/codes_of_conduct';

  /**
   * Get all codes of conduct.
   *
   * Returns array of all GitHub's codes of conduct.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `codesOfConductGetAllCodesOfConduct()` instead.
   *
   * This method doesn't expect any request body.
   */
  codesOfConductGetAllCodesOfConduct$Response(params?: CodesOfConductGetAllCodesOfConduct$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<CodeOfConduct>>> {
    return codesOfConductGetAllCodesOfConduct(this.http, this.rootUrl, params, context);
  }

  /**
   * Get all codes of conduct.
   *
   * Returns array of all GitHub's codes of conduct.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `codesOfConductGetAllCodesOfConduct$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  codesOfConductGetAllCodesOfConduct(params?: CodesOfConductGetAllCodesOfConduct$Params, context?: HttpContext): Observable<Array<CodeOfConduct>> {
    return this.codesOfConductGetAllCodesOfConduct$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<CodeOfConduct>>): Array<CodeOfConduct> => r.body)
    );
  }

  /** Path part for operation `codesOfConductGetConductCode()` */
  static readonly CodesOfConductGetConductCodePath = '/codes_of_conduct/{key}';

  /**
   * Get a code of conduct.
   *
   * Returns information about the specified GitHub code of conduct.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `codesOfConductGetConductCode()` instead.
   *
   * This method doesn't expect any request body.
   */
  codesOfConductGetConductCode$Response(params: CodesOfConductGetConductCode$Params, context?: HttpContext): Observable<StrictHttpResponse<CodeOfConduct>> {
    return codesOfConductGetConductCode(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a code of conduct.
   *
   * Returns information about the specified GitHub code of conduct.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `codesOfConductGetConductCode$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  codesOfConductGetConductCode(params: CodesOfConductGetConductCode$Params, context?: HttpContext): Observable<CodeOfConduct> {
    return this.codesOfConductGetConductCode$Response(params, context).pipe(
      map((r: StrictHttpResponse<CodeOfConduct>): CodeOfConduct => r.body)
    );
  }

}
