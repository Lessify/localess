/* tslint:disable */
/* eslint-disable */
import { CodeScanningAlertClassification } from '../models/code-scanning-alert-classification';
import { CodeScanningAlertEnvironment } from '../models/code-scanning-alert-environment';
import { CodeScanningAlertLocation } from '../models/code-scanning-alert-location';
import { CodeScanningAlertState } from '../models/code-scanning-alert-state';
import { CodeScanningAnalysisAnalysisKey } from '../models/code-scanning-analysis-analysis-key';
import { CodeScanningAnalysisCategory } from '../models/code-scanning-analysis-category';
import { CodeScanningRef } from '../models/code-scanning-ref';
export interface CodeScanningAlertInstance {
  analysis_key?: CodeScanningAnalysisAnalysisKey;
  category?: CodeScanningAnalysisCategory;

  /**
   * Classifications that have been applied to the file that triggered the alert.
   * For example identifying it as documentation, or a generated file.
   */
  classifications?: Array<null | CodeScanningAlertClassification>;
  commit_sha?: string;
  environment?: CodeScanningAlertEnvironment;
  html_url?: string;
  location?: CodeScanningAlertLocation;
  message?: {
'text'?: string;
};
  ref?: CodeScanningRef;
  state?: CodeScanningAlertState;
}
