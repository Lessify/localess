/* tslint:disable */
/* eslint-disable */
import { CodeScanningAnalysisAnalysisKey } from '../models/code-scanning-analysis-analysis-key';
import { CodeScanningAnalysisCategory } from '../models/code-scanning-analysis-category';
import { CodeScanningAnalysisCommitSha } from '../models/code-scanning-analysis-commit-sha';
import { CodeScanningAnalysisCreatedAt } from '../models/code-scanning-analysis-created-at';
import { CodeScanningAnalysisEnvironment } from '../models/code-scanning-analysis-environment';
import { CodeScanningAnalysisSarifId } from '../models/code-scanning-analysis-sarif-id';
import { CodeScanningAnalysisTool } from '../models/code-scanning-analysis-tool';
import { CodeScanningAnalysisUrl } from '../models/code-scanning-analysis-url';
import { CodeScanningRef } from '../models/code-scanning-ref';
export interface CodeScanningAnalysis {
  analysis_key: CodeScanningAnalysisAnalysisKey;
  category?: CodeScanningAnalysisCategory;
  commit_sha: CodeScanningAnalysisCommitSha;
  created_at: CodeScanningAnalysisCreatedAt;
  deletable: boolean;
  environment: CodeScanningAnalysisEnvironment;
  error: string;

  /**
   * Unique identifier for this analysis.
   */
  id: number;
  ref: CodeScanningRef;

  /**
   * The total number of results in the analysis.
   */
  results_count: number;

  /**
   * The total number of rules used in the analysis.
   */
  rules_count: number;
  sarif_id: CodeScanningAnalysisSarifId;
  tool: CodeScanningAnalysisTool;
  url: CodeScanningAnalysisUrl;

  /**
   * Warning generated when processing the analysis
   */
  warning: string;
}
