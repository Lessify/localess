/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { RepositoryInvitation } from '../../models/repository-invitation';

export interface ReposAddCollaborator$Params {

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
      body?: {

/**
 * The permission to grant the collaborator. **Only valid on organization-owned repositories.** We accept the following permissions to be set: `pull`, `triage`, `push`, `maintain`, `admin` and you can also specify a custom repository role name, if the owning organization has defined any.
 */
'permission'?: string;
}
}

export function reposAddCollaborator(http: HttpClient, rootUrl: string, params: ReposAddCollaborator$Params, context?: HttpContext): Observable<StrictHttpResponse<RepositoryInvitation>> {
  const rb = new RequestBuilder(rootUrl, reposAddCollaborator.PATH, 'put');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('username', params.username, {});
    rb.body(params.body, 'application/json');
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<RepositoryInvitation>;
    })
  );
}

reposAddCollaborator.PATH = '/repos/{owner}/{repo}/collaborators/{username}';
