/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Page } from '../../models/page';

export interface ReposCreatePagesSite$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;
      body: ((any | any)) | null
}

export function reposCreatePagesSite(http: HttpClient, rootUrl: string, params: ReposCreatePagesSite$Params, context?: HttpContext): Observable<StrictHttpResponse<Page>> {
  const rb = new RequestBuilder(rootUrl, reposCreatePagesSite.PATH, 'post');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.body(params.body, 'application/json');
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Page>;
    })
  );
}

reposCreatePagesSite.PATH = '/repos/{owner}/{repo}/pages';
