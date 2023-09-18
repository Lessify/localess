/* tslint:disable */
/* eslint-disable */
import { SecretScanningLocationCommit } from '../models/secret-scanning-location-commit';
import { SecretScanningLocationIssueBody } from '../models/secret-scanning-location-issue-body';
import { SecretScanningLocationIssueComment } from '../models/secret-scanning-location-issue-comment';
import { SecretScanningLocationIssueTitle } from '../models/secret-scanning-location-issue-title';
export interface SecretScanningLocation {
  details: (SecretScanningLocationCommit | SecretScanningLocationIssueTitle | SecretScanningLocationIssueBody | SecretScanningLocationIssueComment);

  /**
   * The location type. Because secrets may be found in different types of resources (ie. code, comments, issues), this field identifies the type of resource where the secret was found.
   */
  type: 'commit' | 'issue_title' | 'issue_body' | 'issue_comment';
}
