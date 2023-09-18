/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Release } from '../../models/release';

export interface ReposUpdateRelease$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

/**
 * The unique identifier of the release.
 */
  release_id: number;
      body?: {

/**
 * The name of the tag.
 */
'tag_name'?: string;

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
 * `true` makes the release a draft, and `false` publishes the release.
 */
'draft'?: boolean;

/**
 * `true` to identify the release as a prerelease, `false` to identify the release as a full release.
 */
'prerelease'?: boolean;

/**
 * Specifies whether this release should be set as the latest release for the repository. Drafts and prereleases cannot be set as latest. Defaults to `true` for newly published releases. `legacy` specifies that the latest release should be determined based on the release creation date and higher semantic version.
 */
'make_latest'?: 'true' | 'false' | 'legacy';

/**
 * If specified, a discussion of the specified category is created and linked to the release. The value must be a category that already exists in the repository. If there is already a discussion linked to the release, this parameter is ignored. For more information, see "[Managing categories for discussions in your repository](https://docs.github.com/discussions/managing-discussions-for-your-community/managing-categories-for-discussions-in-your-repository)."
 */
'discussion_category_name'?: string;
}
}

export function reposUpdateRelease(http: HttpClient, rootUrl: string, params: ReposUpdateRelease$Params, context?: HttpContext): Observable<StrictHttpResponse<Release>> {
  const rb = new RequestBuilder(rootUrl, reposUpdateRelease.PATH, 'patch');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('release_id', params.release_id, {});
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

reposUpdateRelease.PATH = '/repos/{owner}/{repo}/releases/{release_id}';
