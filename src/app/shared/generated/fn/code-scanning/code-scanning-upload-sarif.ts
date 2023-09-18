/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { CodeScanningAnalysisCommitSha } from '../../models/code-scanning-analysis-commit-sha';
import { CodeScanningAnalysisSarifFile } from '../../models/code-scanning-analysis-sarif-file';
import { CodeScanningRef } from '../../models/code-scanning-ref';
import { CodeScanningSarifsReceipt } from '../../models/code-scanning-sarifs-receipt';

export interface CodeScanningUploadSarif$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;
      body: {
'commit_sha': CodeScanningAnalysisCommitSha;
'ref': CodeScanningRef;
'sarif': CodeScanningAnalysisSarifFile;

/**
 * The base directory used in the analysis, as it appears in the SARIF file.
 * This property is used to convert file paths from absolute to relative, so that alerts can be mapped to their correct location in the repository.
 */
'checkout_uri'?: string;

/**
 * The time that the analysis run began. This is a timestamp in [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) format: `YYYY-MM-DDTHH:MM:SSZ`.
 */
'started_at'?: string;

/**
 * The name of the tool used to generate the code scanning analysis. If this parameter is not used, the tool name defaults to "API". If the uploaded SARIF contains a tool GUID, this will be available for filtering using the `tool_guid` parameter of operations such as `GET /repos/{owner}/{repo}/code-scanning/alerts`.
 */
'tool_name'?: string;

/**
 * Whether the SARIF file will be validated according to the code scanning specifications.
 * This parameter is intended to help integrators ensure that the uploaded SARIF files are correctly rendered by code scanning.
 */
'validate'?: boolean;
}
}

export function codeScanningUploadSarif(http: HttpClient, rootUrl: string, params: CodeScanningUploadSarif$Params, context?: HttpContext): Observable<StrictHttpResponse<CodeScanningSarifsReceipt>> {
  const rb = new RequestBuilder(rootUrl, codeScanningUploadSarif.PATH, 'post');
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
      return r as StrictHttpResponse<CodeScanningSarifsReceipt>;
    })
  );
}

codeScanningUploadSarif.PATH = '/repos/{owner}/{repo}/code-scanning/sarifs';
