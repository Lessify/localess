/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { GitignoreTemplate } from '../../models/gitignore-template';

export interface GitignoreGetTemplate$Params {
  name: string;
}

export function gitignoreGetTemplate(http: HttpClient, rootUrl: string, params: GitignoreGetTemplate$Params, context?: HttpContext): Observable<StrictHttpResponse<GitignoreTemplate>> {
  const rb = new RequestBuilder(rootUrl, gitignoreGetTemplate.PATH, 'get');
  if (params) {
    rb.path('name', params.name, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<GitignoreTemplate>;
    })
  );
}

gitignoreGetTemplate.PATH = '/gitignore/templates/{name}';
