/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { DependencyGraphDiff } from '../../models/dependency-graph-diff';

export interface DependencyGraphDiffRange$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

/**
 * The base and head Git revisions to compare. The Git revisions will be resolved to commit SHAs. Named revisions will be resolved to their corresponding HEAD commits, and an appropriate merge base will be determined. This parameter expects the format `{base}...{head}`.
 */
  basehead: string;

/**
 * The full path, relative to the repository root, of the dependency manifest file.
 */
  name?: string;
}

export function dependencyGraphDiffRange(http: HttpClient, rootUrl: string, params: DependencyGraphDiffRange$Params, context?: HttpContext): Observable<StrictHttpResponse<DependencyGraphDiff>> {
  const rb = new RequestBuilder(rootUrl, dependencyGraphDiffRange.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('basehead', params.basehead, {});
    rb.query('name', params.name, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<DependencyGraphDiff>;
    })
  );
}

dependencyGraphDiffRange.PATH = '/repos/{owner}/{repo}/dependency-graph/compare/{basehead}';
