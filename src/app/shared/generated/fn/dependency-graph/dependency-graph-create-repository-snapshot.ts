/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Snapshot } from '../../models/snapshot';

export interface DependencyGraphCreateRepositorySnapshot$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;
      body: Snapshot
}

export function dependencyGraphCreateRepositorySnapshot(http: HttpClient, rootUrl: string, params: DependencyGraphCreateRepositorySnapshot$Params, context?: HttpContext): Observable<StrictHttpResponse<{

/**
 * ID of the created snapshot.
 */
'id': number;

/**
 * The time at which the snapshot was created.
 */
'created_at': string;

/**
 * Either "SUCCESS", "ACCEPTED", or "INVALID". "SUCCESS" indicates that the snapshot was successfully created and the repository's dependencies were updated. "ACCEPTED" indicates that the snapshot was successfully created, but the repository's dependencies were not updated. "INVALID" indicates that the snapshot was malformed.
 */
'result': string;

/**
 * A message providing further details about the result, such as why the dependencies were not updated.
 */
'message': string;
}>> {
  const rb = new RequestBuilder(rootUrl, dependencyGraphCreateRepositorySnapshot.PATH, 'post');
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
      return r as StrictHttpResponse<{
      
      /**
       * ID of the created snapshot.
       */
      'id': number;
      
      /**
       * The time at which the snapshot was created.
       */
      'created_at': string;
      
      /**
       * Either "SUCCESS", "ACCEPTED", or "INVALID". "SUCCESS" indicates that the snapshot was successfully created and the repository's dependencies were updated. "ACCEPTED" indicates that the snapshot was successfully created, but the repository's dependencies were not updated. "INVALID" indicates that the snapshot was malformed.
       */
      'result': string;
      
      /**
       * A message providing further details about the result, such as why the dependencies were not updated.
       */
      'message': string;
      }>;
    })
  );
}

dependencyGraphCreateRepositorySnapshot.PATH = '/repos/{owner}/{repo}/dependency-graph/snapshots';
