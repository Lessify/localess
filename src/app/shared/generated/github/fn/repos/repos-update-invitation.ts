/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { RepositoryInvitation } from '../../models/repository-invitation';

export interface ReposUpdateInvitation$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

/**
 * The unique identifier of the invitation.
 */
  invitation_id: number;
      body?: {

/**
 * The permissions that the associated user will have on the repository. Valid values are `read`, `write`, `maintain`, `triage`, and `admin`.
 */
'permissions'?: 'read' | 'write' | 'maintain' | 'triage' | 'admin';
}
}

export function reposUpdateInvitation(http: HttpClient, rootUrl: string, params: ReposUpdateInvitation$Params, context?: HttpContext): Observable<StrictHttpResponse<RepositoryInvitation>> {
  const rb = new RequestBuilder(rootUrl, reposUpdateInvitation.PATH, 'patch');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('invitation_id', params.invitation_id, {});
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

reposUpdateInvitation.PATH = '/repos/{owner}/{repo}/invitations/{invitation_id}';
