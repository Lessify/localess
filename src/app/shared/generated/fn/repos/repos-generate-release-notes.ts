/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { ReleaseNotesContent } from '../../models/release-notes-content';

export interface ReposGenerateReleaseNotes$Params {

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
 * The tag name for the release. This can be an existing tag or a new one.
 */
'tag_name': string;

/**
 * Specifies the commitish value that will be the target for the release's tag. Required if the supplied tag_name does not reference an existing tag. Ignored if the tag_name already exists.
 */
'target_commitish'?: string;

/**
 * The name of the previous tag to use as the starting point for the release notes. Use to manually specify the range for the set of changes considered as part this release.
 */
'previous_tag_name'?: string;

/**
 * Specifies a path to a file in the repository containing configuration settings used for generating the release notes. If unspecified, the configuration file located in the repository at '.github/release.yml' or '.github/release.yaml' will be used. If that is not present, the default configuration will be used.
 */
'configuration_file_path'?: string;
}
}

export function reposGenerateReleaseNotes(http: HttpClient, rootUrl: string, params: ReposGenerateReleaseNotes$Params, context?: HttpContext): Observable<StrictHttpResponse<ReleaseNotesContent>> {
  const rb = new RequestBuilder(rootUrl, reposGenerateReleaseNotes.PATH, 'post');
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
      return r as StrictHttpResponse<ReleaseNotesContent>;
    })
  );
}

reposGenerateReleaseNotes.PATH = '/repos/{owner}/{repo}/releases/generate-notes';
