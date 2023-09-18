/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';


export interface ProjectsMoveCard$Params {

/**
 * The unique identifier of the card.
 */
  card_id: number;
      body: {

/**
 * The position of the card in a column. Can be one of: `top`, `bottom`, or `after:<card_id>` to place after the specified card.
 */
'position': string;

/**
 * The unique identifier of the column the card should be moved to
 */
'column_id'?: number;
}
}

export function projectsMoveCard(http: HttpClient, rootUrl: string, params: ProjectsMoveCard$Params, context?: HttpContext): Observable<StrictHttpResponse<{
}>> {
  const rb = new RequestBuilder(rootUrl, projectsMoveCard.PATH, 'post');
  if (params) {
    rb.path('card_id', params.card_id, {});
    rb.body(params.body, 'application/json');
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<{
      }>;
    })
  );
}

projectsMoveCard.PATH = '/projects/columns/cards/{card_id}/moves';
