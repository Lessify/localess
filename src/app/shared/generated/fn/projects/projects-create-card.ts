/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { ProjectCard } from '../../models/project-card';

export interface ProjectsCreateCard$Params {

/**
 * The unique identifier of the column.
 */
  column_id: number;
      body: ({

/**
 * The project card's note
 */
'note': string | null;
} | {

/**
 * The unique identifier of the content associated with the card
 */
'content_id': number;

/**
 * The piece of content associated with the card
 */
'content_type': string;
})
}

export function projectsCreateCard(http: HttpClient, rootUrl: string, params: ProjectsCreateCard$Params, context?: HttpContext): Observable<StrictHttpResponse<ProjectCard>> {
  const rb = new RequestBuilder(rootUrl, projectsCreateCard.PATH, 'post');
  if (params) {
    rb.path('column_id', params.column_id, {});
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

projectsCreateCard.PATH = '/projects/columns/{column_id}/cards';
