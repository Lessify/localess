/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { HookDeliveryItem } from '../../models/hook-delivery-item';

export interface ReposListWebhookDeliveries$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

/**
 * The unique identifier of the hook.
 */
  hook_id: number;

/**
 * The number of results per page (max 100).
 */
  per_page?: number;

/**
 * Used for pagination: the starting delivery from which the page of deliveries is fetched. Refer to the `link` header for the next and previous page cursors.
 */
  cursor?: string;
  redelivery?: boolean;
}

export function reposListWebhookDeliveries(http: HttpClient, rootUrl: string, params: ReposListWebhookDeliveries$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<HookDeliveryItem>>> {
  const rb = new RequestBuilder(rootUrl, reposListWebhookDeliveries.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('hook_id', params.hook_id, {});
    rb.query('per_page', params.per_page, {});
    rb.query('cursor', params.cursor, {});
    rb.query('redelivery', params.redelivery, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Array<HookDeliveryItem>>;
    })
  );
}

reposListWebhookDeliveries.PATH = '/repos/{owner}/{repo}/hooks/{hook_id}/deliveries';
