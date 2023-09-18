/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { RepositorySubscription } from '../../models/repository-subscription';

export interface ActivitySetRepoSubscription$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;
      body?: {

/**
 * Determines if notifications should be received from this repository.
 */
'subscribed'?: boolean;

/**
 * Determines if all notifications should be blocked from this repository.
 */
'ignored'?: boolean;
}
}

export function activitySetRepoSubscription(http: HttpClient, rootUrl: string, params: ActivitySetRepoSubscription$Params, context?: HttpContext): Observable<StrictHttpResponse<RepositorySubscription>> {
  const rb = new RequestBuilder(rootUrl, activitySetRepoSubscription.PATH, 'put');
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
      return r as StrictHttpResponse<RepositorySubscription>;
    })
  );
}

activitySetRepoSubscription.PATH = '/repos/{owner}/{repo}/subscription';
