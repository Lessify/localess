/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Repository } from '../../models/repository';

export interface ReposCreateUsingTemplate$Params {

/**
 * The account owner of the template repository. The name is not case sensitive.
 */
  template_owner: string;

/**
 * The name of the template repository without the `.git` extension. The name is not case sensitive.
 */
  template_repo: string;
      body: {

/**
 * The organization or person who will own the new repository. To create a new repository in an organization, the authenticated user must be a member of the specified organization.
 */
'owner'?: string;

/**
 * The name of the new repository.
 */
'name': string;

/**
 * A short description of the new repository.
 */
'description'?: string;

/**
 * Set to `true` to include the directory structure and files from all branches in the template repository, and not just the default branch. Default: `false`.
 */
'include_all_branches'?: boolean;

/**
 * Either `true` to create a new private repository or `false` to create a new public one.
 */
'private'?: boolean;
}
}

export function reposCreateUsingTemplate(http: HttpClient, rootUrl: string, params: ReposCreateUsingTemplate$Params, context?: HttpContext): Observable<StrictHttpResponse<Repository>> {
  const rb = new RequestBuilder(rootUrl, reposCreateUsingTemplate.PATH, 'post');
  if (params) {
    rb.path('template_owner', params.template_owner, {});
    rb.path('template_repo', params.template_repo, {});
    rb.body(params.body, 'application/json');
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Repository>;
    })
  );
}

reposCreateUsingTemplate.PATH = '/repos/{template_owner}/{template_repo}/generate';
