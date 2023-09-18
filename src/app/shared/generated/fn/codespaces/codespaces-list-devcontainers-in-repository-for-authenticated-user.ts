/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';


export interface CodespacesListDevcontainersInRepositoryForAuthenticatedUser$Params {

/**
 * The number of results per page (max 100).
 */
  per_page?: number;

/**
 * Page number of the results to fetch.
 */
  page?: number;

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;
}

export function codespacesListDevcontainersInRepositoryForAuthenticatedUser(http: HttpClient, rootUrl: string, params: CodespacesListDevcontainersInRepositoryForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'devcontainers': Array<{
'path': string;
'name'?: string;
'display_name'?: string;
}>;
}>> {
  const rb = new RequestBuilder(rootUrl, codespacesListDevcontainersInRepositoryForAuthenticatedUser.PATH, 'get');
  if (params) {
    rb.query('per_page', params.per_page, {});
    rb.query('page', params.page, {});
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<{
      'total_count': number;
      'devcontainers': Array<{
      'path': string;
      'name'?: string;
      'display_name'?: string;
      }>;
      }>;
    })
  );
}

codespacesListDevcontainersInRepositoryForAuthenticatedUser.PATH = '/repos/{owner}/{repo}/codespaces/devcontainers';
