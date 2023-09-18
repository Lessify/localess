/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Autolink } from '../../models/autolink';

export interface ReposListAutolinks$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

/**
 * Page number of the results to fetch.
 */
  page?: number;
}

export function reposListAutolinks(http: HttpClient, rootUrl: string, params: ReposListAutolinks$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Autolink>>> {
  const rb = new RequestBuilder(rootUrl, reposListAutolinks.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.query('page', params.page, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Array<Autolink>>;
    })
  );
}

reposListAutolinks.PATH = '/repos/{owner}/{repo}/autolinks';
