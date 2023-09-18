/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';


export interface OrgsEnableOrDisableSecurityProductOnAllOrgRepos$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;

/**
 * The security feature to enable or disable.
 */
  security_product: 'dependency_graph' | 'dependabot_alerts' | 'dependabot_security_updates' | 'advanced_security' | 'code_scanning_default_setup' | 'secret_scanning' | 'secret_scanning_push_protection';

/**
 * The action to take.
 *
 * `enable_all` means to enable the specified security feature for all repositories in the organization.
 * `disable_all` means to disable the specified security feature for all repositories in the organization.
 */
  enablement: 'enable_all' | 'disable_all';
      body?: {

/**
 * CodeQL query suite to be used. If you specify the `query_suite` parameter, the default setup will be configured with this query suite only on all repositories that didn't have default setup already configured. It will not change the query suite on repositories that already have default setup configured.
 * If you don't specify any `query_suite` in your request, the preferred query suite of the organization will be applied.
 */
'query_suite'?: 'default' | 'extended';
}
}

export function orgsEnableOrDisableSecurityProductOnAllOrgRepos(http: HttpClient, rootUrl: string, params: OrgsEnableOrDisableSecurityProductOnAllOrgRepos$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
  const rb = new RequestBuilder(rootUrl, orgsEnableOrDisableSecurityProductOnAllOrgRepos.PATH, 'post');
  if (params) {
    rb.path('org', params.org, {});
    rb.path('security_product', params.security_product, {});
    rb.path('enablement', params.enablement, {});
    rb.body(params.body, 'application/json');
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

orgsEnableOrDisableSecurityProductOnAllOrgRepos.PATH = '/orgs/{org}/{security_product}/{enablement}';
