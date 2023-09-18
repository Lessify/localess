/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { OidcCustomSub } from '../../models/oidc-custom-sub';

export interface OidcGetOidcCustomSubTemplateForOrg$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;
}

export function oidcGetOidcCustomSubTemplateForOrg(http: HttpClient, rootUrl: string, params: OidcGetOidcCustomSubTemplateForOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<OidcCustomSub>> {
  const rb = new RequestBuilder(rootUrl, oidcGetOidcCustomSubTemplateForOrg.PATH, 'get');
  if (params) {
    rb.path('org', params.org, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<OidcCustomSub>;
    })
  );
}

oidcGetOidcCustomSubTemplateForOrg.PATH = '/orgs/{org}/actions/oidc/customization/sub';
