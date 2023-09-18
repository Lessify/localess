/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { ProtectedBranchAdminEnforced } from '../../models/protected-branch-admin-enforced';

export interface ReposCreateCommitSignatureProtection$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

/**
 * The name of the branch. Cannot contain wildcard characters. To use wildcard characters in branch names, use [the GraphQL API](https://docs.github.com/graphql).
 */
  branch: string;
}

export function reposCreateCommitSignatureProtection(http: HttpClient, rootUrl: string, params: ReposCreateCommitSignatureProtection$Params, context?: HttpContext): Observable<StrictHttpResponse<ProtectedBranchAdminEnforced>> {
  const rb = new RequestBuilder(rootUrl, reposCreateCommitSignatureProtection.PATH, 'post');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('branch', params.branch, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<ProtectedBranchAdminEnforced>;
    })
  );
}

reposCreateCommitSignatureProtection.PATH = '/repos/{owner}/{repo}/branches/{branch}/protection/required_signatures';
