/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { CopilotSeatDetails } from '../../models/copilot-seat-details';

export interface CopilotListCopilotSeats$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;

/**
 * Page number of the results to fetch.
 */
  page?: number;

/**
 * The number of results per page (max 100).
 */
  per_page?: number;
}

export function copilotListCopilotSeats(http: HttpClient, rootUrl: string, params: CopilotListCopilotSeats$Params, context?: HttpContext): Observable<StrictHttpResponse<{

/**
 * Total number of Copilot For Business seats for the organization currently being billed.
 */
'total_seats'?: number;
'seats'?: Array<CopilotSeatDetails>;
}>> {
  const rb = new RequestBuilder(rootUrl, copilotListCopilotSeats.PATH, 'get');
  if (params) {
    rb.path('org', params.org, {});
    rb.query('page', params.page, {});
    rb.query('per_page', params.per_page, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<{
      
      /**
       * Total number of Copilot For Business seats for the organization currently being billed.
       */
      'total_seats'?: number;
      'seats'?: Array<CopilotSeatDetails>;
      }>;
    })
  );
}

copilotListCopilotSeats.PATH = '/orgs/{org}/copilot/billing/seats';
