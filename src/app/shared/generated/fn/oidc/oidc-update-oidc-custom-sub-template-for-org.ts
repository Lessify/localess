/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { EmptyObject } from '../../models/empty-object';
import { OidcCustomSub } from '../../models/oidc-custom-sub';

export interface OidcUpdateOidcCustomSubTemplateForOrg$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;
      body: OidcCustomSub
}

export function oidcUpdateOidcCustomSubTemplateForOrg(http: HttpClient, rootUrl: string, params: OidcUpdateOidcCustomSubTemplateForOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<EmptyObject>> {
  const rb = new RequestBuilder(rootUrl, oidcUpdateOidcCustomSubTemplateForOrg.PATH, 'put');
  if (params) {
    rb.path('org', params.org, {});
    rb.body(params.body, 'application/json');
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<EmptyObject>;
    })
  );
}

oidcUpdateOidcCustomSubTemplateForOrg.PATH = '/orgs/{org}/actions/oidc/customization/sub';
