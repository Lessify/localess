/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { RepositoryCollaboratorPermission } from '../../models/repository-collaborator-permission';

export interface ReposGetCollaboratorPermissionLevel$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

/**
 * The handle for the GitHub user account.
 */
  username: string;
}

export function reposGetCollaboratorPermissionLevel(http: HttpClient, rootUrl: string, params: ReposGetCollaboratorPermissionLevel$Params, context?: HttpContext): Observable<StrictHttpResponse<RepositoryCollaboratorPermission>> {
  const rb = new RequestBuilder(rootUrl, reposGetCollaboratorPermissionLevel.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('username', params.username, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<RepositoryCollaboratorPermission>;
    })
  );
}

reposGetCollaboratorPermissionLevel.PATH = '/repos/{owner}/{repo}/collaborators/{username}/permission';
