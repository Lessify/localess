/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { ProjectCard } from '../../models/project-card';

export interface ProjectsUpdateCard$Params {

/**
 * The unique identifier of the card.
 */
  card_id: number;
      body?: {

/**
 * The project card's note
 */
'note'?: string | null;

/**
 * Whether or not the card is archived
 */
'archived'?: boolean;
}
}

export function projectsUpdateCard(http: HttpClient, rootUrl: string, params: ProjectsUpdateCard$Params, context?: HttpContext): Observable<StrictHttpResponse<ProjectCard>> {
  const rb = new RequestBuilder(rootUrl, projectsUpdateCard.PATH, 'patch');
  if (params) {
    rb.path('card_id', params.card_id, {});
    rb.body(params.body, 'application/json');
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<ProjectCard>;
    })
  );
}

projectsUpdateCard.PATH = '/projects/columns/cards/{card_id}';
