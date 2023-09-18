/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { MarketplacePurchase } from '../../models/marketplace-purchase';

export interface AppsListAccountsForPlan$Params {

/**
 * The unique identifier of the plan.
 */
  plan_id: number;

/**
 * The property to sort the results by.
 */
  sort?: 'created' | 'updated';

/**
 * To return the oldest accounts first, set to `asc`. Ignored without the `sort` parameter.
 */
  direction?: 'asc' | 'desc';

/**
 * The number of results per page (max 100).
 */
  per_page?: number;

/**
 * Page number of the results to fetch.
 */
  page?: number;
}

export function appsListAccountsForPlan(http: HttpClient, rootUrl: string, params: AppsListAccountsForPlan$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<MarketplacePurchase>>> {
  const rb = new RequestBuilder(rootUrl, appsListAccountsForPlan.PATH, 'get');
  if (params) {
    rb.path('plan_id', params.plan_id, {});
    rb.query('sort', params.sort, {});
    rb.query('direction', params.direction, {});
    rb.query('per_page', params.per_page, {});
    rb.query('page', params.page, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Array<MarketplacePurchase>>;
    })
  );
}

appsListAccountsForPlan.PATH = '/marketplace_listing/plans/{plan_id}/accounts';
