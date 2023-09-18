/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { ProjectCard } from '../../models/project-card';

export interface ProjectsListCards$Params {

/**
 * The unique identifier of the column.
 */
  column_id: number;

/**
 * Filters the project cards that are returned by the card's state.
 */
  archived_state?: 'all' | 'archived' | 'not_archived';

/**
 * The number of results per page (max 100).
 */
  per_page?: number;

/**
 * Page number of the results to fetch.
 */
  page?: number;
}

export function projectsListCards(http: HttpClient, rootUrl: string, params: ProjectsListCards$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<ProjectCard>>> {
  const rb = new RequestBuilder(rootUrl, projectsListCards.PATH, 'get');
  if (params) {
    rb.path('column_id', params.column_id, {});
    rb.query('archived_state', params.archived_state, {});
    rb.query('per_page', params.per_page, {});
    rb.query('page', params.page, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Array<ProjectCard>>;
    })
  );
}

projectsListCards.PATH = '/projects/columns/{column_id}/cards';
