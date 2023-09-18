/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Autolink } from '../../models/autolink';

export interface ReposCreateAutolink$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;
      body: {

/**
 * This prefix appended by certain characters will generate a link any time it is found in an issue, pull request, or commit.
 */
'key_prefix': string;

/**
 * The URL must contain `<num>` for the reference number. `<num>` matches different characters depending on the value of `is_alphanumeric`.
 */
'url_template': string;

/**
 * Whether this autolink reference matches alphanumeric characters. If true, the `<num>` parameter of the `url_template` matches alphanumeric characters `A-Z` (case insensitive), `0-9`, and `-`. If false, this autolink reference only matches numeric characters.
 */
'is_alphanumeric'?: boolean;
}
}

export function reposCreateAutolink(http: HttpClient, rootUrl: string, params: ReposCreateAutolink$Params, context?: HttpContext): Observable<StrictHttpResponse<Autolink>> {
  const rb = new RequestBuilder(rootUrl, reposCreateAutolink.PATH, 'post');
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
      return r as StrictHttpResponse<Autolink>;
    })
  );
}

reposCreateAutolink.PATH = '/repos/{owner}/{repo}/autolinks';
