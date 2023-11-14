/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Collaborator } from '../../models/collaborator';

export interface ReposListCollaborators$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

/**
 * Filter collaborators returned by their affiliation. `outside` means all outside collaborators of an organization-owned repository. `direct` means all collaborators with permissions to an organization-owned repository, regardless of organization membership status. `all` means all collaborators the authenticated user can see.
 */
  affiliation?: 'outside' | 'direct' | 'all';

/**
 * Filter collaborators by the permissions they have on the repository. If not specified, all collaborators will be returned.
 */
  permission?: 'pull' | 'triage' | 'push' | 'maintain' | 'admin';

/**
 * The number of results per page (max 100).
 */
  per_page?: number;

/**
 * Page number of the results to fetch.
 */
  page?: number;
}

export function reposListCollaborators(http: HttpClient, rootUrl: string, params: ReposListCollaborators$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Collaborator>>> {
  const rb = new RequestBuilder(rootUrl, reposListCollaborators.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.query('affiliation', params.affiliation, {});
    rb.query('permission', params.permission, {});
    rb.query('per_page', params.per_page, {});
    rb.query('page', params.page, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Array<Collaborator>>;
    })
  );
}

reposListCollaborators.PATH = '/repos/{owner}/{repo}/collaborators';
