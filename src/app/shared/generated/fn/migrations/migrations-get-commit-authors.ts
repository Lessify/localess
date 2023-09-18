/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { PorterAuthor } from '../../models/porter-author';

export interface MigrationsGetCommitAuthors$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

/**
 * A user ID. Only return users with an ID greater than this ID.
 */
  since?: number;
}

export function migrationsGetCommitAuthors(http: HttpClient, rootUrl: string, params: MigrationsGetCommitAuthors$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<PorterAuthor>>> {
  const rb = new RequestBuilder(rootUrl, migrationsGetCommitAuthors.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.query('since', params.since, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Array<PorterAuthor>>;
    })
  );
}

migrationsGetCommitAuthors.PATH = '/repos/{owner}/{repo}/import/authors';
