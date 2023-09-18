/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { MarketplacePurchase } from '../../models/marketplace-purchase';

export interface AppsGetSubscriptionPlanForAccountStubbed$Params {

/**
 * account_id parameter
 */
  account_id: number;
}

export function appsGetSubscriptionPlanForAccountStubbed(http: HttpClient, rootUrl: string, params: AppsGetSubscriptionPlanForAccountStubbed$Params, context?: HttpContext): Observable<StrictHttpResponse<MarketplacePurchase>> {
  const rb = new RequestBuilder(rootUrl, appsGetSubscriptionPlanForAccountStubbed.PATH, 'get');
  if (params) {
    rb.path('account_id', params.account_id, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<MarketplacePurchase>;
    })
  );
}

appsGetSubscriptionPlanForAccountStubbed.PATH = '/marketplace_listing/stubbed/accounts/{account_id}';
