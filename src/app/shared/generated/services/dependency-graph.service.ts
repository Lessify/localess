/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { BaseService } from '../base-service';
import { ApiConfiguration } from '../api-configuration';
import { StrictHttpResponse } from '../strict-http-response';

import { DependencyGraphDiff } from '../models/dependency-graph-diff';
import { DependencyGraphSpdxSbom } from '../models/dependency-graph-spdx-sbom';
import { dependencyGraphCreateRepositorySnapshot } from '../fn/dependency-graph/dependency-graph-create-repository-snapshot';
import { DependencyGraphCreateRepositorySnapshot$Params } from '../fn/dependency-graph/dependency-graph-create-repository-snapshot';
import { dependencyGraphDiffRange } from '../fn/dependency-graph/dependency-graph-diff-range';
import { DependencyGraphDiffRange$Params } from '../fn/dependency-graph/dependency-graph-diff-range';
import { dependencyGraphExportSbom } from '../fn/dependency-graph/dependency-graph-export-sbom';
import { DependencyGraphExportSbom$Params } from '../fn/dependency-graph/dependency-graph-export-sbom';


/**
 * Endpoints to access Dependency Graph features.
 */
@Injectable({ providedIn: 'root' })
export class DependencyGraphService extends BaseService {
  constructor(config: ApiConfiguration, http: HttpClient) {
    super(config, http);
  }

  /** Path part for operation `dependencyGraphDiffRange()` */
  static readonly DependencyGraphDiffRangePath = '/repos/{owner}/{repo}/dependency-graph/compare/{basehead}';

  /**
   * Get a diff of the dependencies between commits.
   *
   * Gets the diff of the dependency changes between two commits of a repository, based on the changes to the dependency manifests made in those commits.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `dependencyGraphDiffRange()` instead.
   *
   * This method doesn't expect any request body.
   */
  dependencyGraphDiffRange$Response(params: DependencyGraphDiffRange$Params, context?: HttpContext): Observable<StrictHttpResponse<DependencyGraphDiff>> {
    return dependencyGraphDiffRange(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a diff of the dependencies between commits.
   *
   * Gets the diff of the dependency changes between two commits of a repository, based on the changes to the dependency manifests made in those commits.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `dependencyGraphDiffRange$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  dependencyGraphDiffRange(params: DependencyGraphDiffRange$Params, context?: HttpContext): Observable<DependencyGraphDiff> {
    return this.dependencyGraphDiffRange$Response(params, context).pipe(
      map((r: StrictHttpResponse<DependencyGraphDiff>): DependencyGraphDiff => r.body)
    );
  }

  /** Path part for operation `dependencyGraphExportSbom()` */
  static readonly DependencyGraphExportSbomPath = '/repos/{owner}/{repo}/dependency-graph/sbom';

  /**
   * Export a software bill of materials (SBOM) for a repository.
   *
   * Exports the software bill of materials (SBOM) for a repository in SPDX JSON format.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `dependencyGraphExportSbom()` instead.
   *
   * This method doesn't expect any request body.
   */
  dependencyGraphExportSbom$Response(params: DependencyGraphExportSbom$Params, context?: HttpContext): Observable<StrictHttpResponse<DependencyGraphSpdxSbom>> {
    return dependencyGraphExportSbom(this.http, this.rootUrl, params, context);
  }

  /**
   * Export a software bill of materials (SBOM) for a repository.
   *
   * Exports the software bill of materials (SBOM) for a repository in SPDX JSON format.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `dependencyGraphExportSbom$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  dependencyGraphExportSbom(params: DependencyGraphExportSbom$Params, context?: HttpContext): Observable<DependencyGraphSpdxSbom> {
    return this.dependencyGraphExportSbom$Response(params, context).pipe(
      map((r: StrictHttpResponse<DependencyGraphSpdxSbom>): DependencyGraphSpdxSbom => r.body)
    );
  }

  /** Path part for operation `dependencyGraphCreateRepositorySnapshot()` */
  static readonly DependencyGraphCreateRepositorySnapshotPath = '/repos/{owner}/{repo}/dependency-graph/snapshots';

  /**
   * Create a snapshot of dependencies for a repository.
   *
   * Create a new snapshot of a repository's dependencies. You must authenticate using an access token with the `repo` scope to use this endpoint for a repository that the requesting user has access to.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `dependencyGraphCreateRepositorySnapshot()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  dependencyGraphCreateRepositorySnapshot$Response(params: DependencyGraphCreateRepositorySnapshot$Params, context?: HttpContext): Observable<StrictHttpResponse<{

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
    return dependencyGraphCreateRepositorySnapshot(this.http, this.rootUrl, params, context);
  }

  /**
   * Create a snapshot of dependencies for a repository.
   *
   * Create a new snapshot of a repository's dependencies. You must authenticate using an access token with the `repo` scope to use this endpoint for a repository that the requesting user has access to.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `dependencyGraphCreateRepositorySnapshot$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  dependencyGraphCreateRepositorySnapshot(params: DependencyGraphCreateRepositorySnapshot$Params, context?: HttpContext): Observable<{

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
}> {
    return this.dependencyGraphCreateRepositorySnapshot$Response(params, context).pipe(
      map((r: StrictHttpResponse<{

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
}>): {

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
} => r.body)
    );
  }

}
