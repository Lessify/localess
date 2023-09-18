/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { LabelSearchResultItem } from '../../models/label-search-result-item';

export interface SearchLabels$Params {

/**
 * The id of the repository.
 */
  repository_id: number;

/**
 * The search keywords. This endpoint does not accept qualifiers in the query. To learn more about the format of the query, see [Constructing a search query](https://docs.github.com/rest/search/search#constructing-a-search-query).
 */
  q: string;

/**
 * Sorts the results of your query by when the label was `created` or `updated`. Default: [best match](https://docs.github.com/rest/search/search#ranking-search-results)
 */
  sort?: 'created' | 'updated';

/**
 * Determines whether the first search result returned is the highest number of matches (`desc`) or lowest number of matches (`asc`). This parameter is ignored unless you provide `sort`.
 */
  order?: 'desc' | 'asc';

/**
 * The number of results per page (max 100).
 */
  per_page?: number;

/**
 * Page number of the results to fetch.
 */
  page?: number;
}

export function searchLabels(http: HttpClient, rootUrl: string, params: SearchLabels$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'incomplete_results': boolean;
'items': Array<LabelSearchResultItem>;
}>> {
  const rb = new RequestBuilder(rootUrl, searchLabels.PATH, 'get');
  if (params) {
    rb.query('repository_id', params.repository_id, {});
    rb.query('q', params.q, {});
    rb.query('sort', params.sort, {});
    rb.query('order', params.order, {});
    rb.query('per_page', params.per_page, {});
    rb.query('page', params.page, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<{
      'total_count': number;
      'incomplete_results': boolean;
      'items': Array<LabelSearchResultItem>;
      }>;
    })
  );
}

searchLabels.PATH = '/search/labels';
