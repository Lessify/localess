/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { BaseService } from '../base-service';
import { ApiConfiguration } from '../api-configuration';
import { StrictHttpResponse } from '../strict-http-response';

import { EmptyObject } from '../models/empty-object';
import { OidcCustomSub } from '../models/oidc-custom-sub';
import { oidcGetOidcCustomSubTemplateForOrg } from '../fn/oidc/oidc-get-oidc-custom-sub-template-for-org';
import { OidcGetOidcCustomSubTemplateForOrg$Params } from '../fn/oidc/oidc-get-oidc-custom-sub-template-for-org';
import { oidcUpdateOidcCustomSubTemplateForOrg } from '../fn/oidc/oidc-update-oidc-custom-sub-template-for-org';
import { OidcUpdateOidcCustomSubTemplateForOrg$Params } from '../fn/oidc/oidc-update-oidc-custom-sub-template-for-org';


/**
 * Endpoints to manage GitHub OIDC configuration using the REST API.
 */
@Injectable({ providedIn: 'root' })
export class OidcService extends BaseService {
  constructor(config: ApiConfiguration, http: HttpClient) {
    super(config, http);
  }

  /** Path part for operation `oidcGetOidcCustomSubTemplateForOrg()` */
  static readonly OidcGetOidcCustomSubTemplateForOrgPath = '/orgs/{org}/actions/oidc/customization/sub';

  /**
   * Get the customization template for an OIDC subject claim for an organization.
   *
   * Gets the customization template for an OpenID Connect (OIDC) subject claim.
   * You must authenticate using an access token with the `read:org` scope to use this endpoint.
   * GitHub Apps must have the `organization_administration:write` permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `oidcGetOidcCustomSubTemplateForOrg()` instead.
   *
   * This method doesn't expect any request body.
   */
  oidcGetOidcCustomSubTemplateForOrg$Response(params: OidcGetOidcCustomSubTemplateForOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<OidcCustomSub>> {
    return oidcGetOidcCustomSubTemplateForOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * Get the customization template for an OIDC subject claim for an organization.
   *
   * Gets the customization template for an OpenID Connect (OIDC) subject claim.
   * You must authenticate using an access token with the `read:org` scope to use this endpoint.
   * GitHub Apps must have the `organization_administration:write` permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `oidcGetOidcCustomSubTemplateForOrg$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  oidcGetOidcCustomSubTemplateForOrg(params: OidcGetOidcCustomSubTemplateForOrg$Params, context?: HttpContext): Observable<OidcCustomSub> {
    return this.oidcGetOidcCustomSubTemplateForOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<OidcCustomSub>): OidcCustomSub => r.body)
    );
  }

  /** Path part for operation `oidcUpdateOidcCustomSubTemplateForOrg()` */
  static readonly OidcUpdateOidcCustomSubTemplateForOrgPath = '/orgs/{org}/actions/oidc/customization/sub';

  /**
   * Set the customization template for an OIDC subject claim for an organization.
   *
   * Creates or updates the customization template for an OpenID Connect (OIDC) subject claim.
   * You must authenticate using an access token with the `write:org` scope to use this endpoint.
   * GitHub Apps must have the `admin:org` permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `oidcUpdateOidcCustomSubTemplateForOrg()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  oidcUpdateOidcCustomSubTemplateForOrg$Response(params: OidcUpdateOidcCustomSubTemplateForOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<EmptyObject>> {
    return oidcUpdateOidcCustomSubTemplateForOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * Set the customization template for an OIDC subject claim for an organization.
   *
   * Creates or updates the customization template for an OpenID Connect (OIDC) subject claim.
   * You must authenticate using an access token with the `write:org` scope to use this endpoint.
   * GitHub Apps must have the `admin:org` permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `oidcUpdateOidcCustomSubTemplateForOrg$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  oidcUpdateOidcCustomSubTemplateForOrg(params: OidcUpdateOidcCustomSubTemplateForOrg$Params, context?: HttpContext): Observable<EmptyObject> {
    return this.oidcUpdateOidcCustomSubTemplateForOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<EmptyObject>): EmptyObject => r.body)
    );
  }

}
