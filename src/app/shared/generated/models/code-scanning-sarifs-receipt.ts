/* tslint:disable */
/* eslint-disable */
import { CodeScanningAnalysisSarifId } from '../models/code-scanning-analysis-sarif-id';
export interface CodeScanningSarifsReceipt {
  id?: CodeScanningAnalysisSarifId;

  /**
   * The REST API URL for checking the status of the upload.
   */
  url?: string;
}
