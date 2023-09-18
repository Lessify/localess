/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Artifact } from '../../models/artifact';

export interface ActionsGetArtifact$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

/**
 * The unique identifier of the artifact.
 */
  artifact_id: number;
}

export function actionsGetArtifact(http: HttpClient, rootUrl: string, params: ActionsGetArtifact$Params, context?: HttpContext): Observable<StrictHttpResponse<Artifact>> {
  const rb = new RequestBuilder(rootUrl, actionsGetArtifact.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('artifact_id', params.artifact_id, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Artifact>;
    })
  );
}

actionsGetArtifact.PATH = '/repos/{owner}/{repo}/actions/artifacts/{artifact_id}';
