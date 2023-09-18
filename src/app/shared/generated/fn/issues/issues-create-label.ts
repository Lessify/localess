/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Label } from '../../models/label';

export interface IssuesCreateLabel$Params {

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
 * The name of the label. Emoji can be added to label names, using either native emoji or colon-style markup. For example, typing `:strawberry:` will render the emoji ![:strawberry:](https://github.githubassets.com/images/icons/emoji/unicode/1f353.png ":strawberry:"). For a full list of available emoji and codes, see "[Emoji cheat sheet](https://github.com/ikatyang/emoji-cheat-sheet)."
 */
'name': string;

/**
 * The [hexadecimal color code](http://www.color-hex.com/) for the label, without the leading `#`.
 */
'color'?: string;

/**
 * A short description of the label. Must be 100 characters or fewer.
 */
'description'?: string;
}
}

export function issuesCreateLabel(http: HttpClient, rootUrl: string, params: IssuesCreateLabel$Params, context?: HttpContext): Observable<StrictHttpResponse<Label>> {
  const rb = new RequestBuilder(rootUrl, issuesCreateLabel.PATH, 'post');
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
      return r as StrictHttpResponse<Label>;
    })
  );
}

issuesCreateLabel.PATH = '/repos/{owner}/{repo}/labels';
