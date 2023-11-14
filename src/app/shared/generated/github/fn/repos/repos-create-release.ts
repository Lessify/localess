/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Release } from '../../models/release';

export interface ReposCreateRelease$Params {

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
 * The name of the tag.
 */
'tag_name': string;

/**
 * Specifies the commitish value that determines where the Git tag is created from. Can be any branch or commit SHA. Unused if the Git tag already exists. Default: the repository's default branch.
 */
'target_commitish'?: string;

/**
 * The name of the release.
 */
'name'?: string;

/**
 * Text describing the contents of the tag.
 */
'body'?: string;

/**
 * `true` to create a draft (unpublished) release, `false` to create a published one.
 */
'draft'?: boolean;

/**
 * `true` to identify the release as a prerelease. `false` to identify the release as a full release.
 */
'prerelease'?: boolean;

/**
 * If specified, a discussion of the specified category is created and linked to the release. The value must be a category that already exists in the repository. For more information, see "[Managing categories for discussions in your repository](https://docs.github.com/discussions/managing-discussions-for-your-community/managing-categories-for-discussions-in-your-repository)."
 */
'discussion_category_name'?: string;

/**
 * Whether to automatically generate the name and body for this release. If `name` is specified, the specified name will be used; otherwise, a name will be automatically generated. If `body` is specified, the body will be pre-pended to the automatically generated notes.
 */
'generate_release_notes'?: boolean;

/**
 * Specifies whether this release should be set as the latest release for the repository. Drafts and prereleases cannot be set as latest. Defaults to `true` for newly published releases. `legacy` specifies that the latest release should be determined based on the release creation date and higher semantic version.
 */
'make_latest'?: 'true' | 'false' | 'legacy';
}
}

export function reposCreateRelease(http: HttpClient, rootUrl: string, params: ReposCreateRelease$Params, context?: HttpContext): Observable<StrictHttpResponse<Release>> {
  const rb = new RequestBuilder(rootUrl, reposCreateRelease.PATH, 'post');
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
      return r as StrictHttpResponse<Release>;
    })
  );
}

reposCreateRelease.PATH = '/repos/{owner}/{repo}/releases';
