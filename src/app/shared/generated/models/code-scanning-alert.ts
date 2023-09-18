/* tslint:disable */
/* eslint-disable */
import { AlertCreatedAt } from '../models/alert-created-at';
import { AlertDismissedAt } from '../models/alert-dismissed-at';
import { AlertFixedAt } from '../models/alert-fixed-at';
import { AlertHtmlUrl } from '../models/alert-html-url';
import { AlertInstancesUrl } from '../models/alert-instances-url';
import { AlertNumber } from '../models/alert-number';
import { AlertUpdatedAt } from '../models/alert-updated-at';
import { AlertUrl } from '../models/alert-url';
import { CodeScanningAlertDismissedComment } from '../models/code-scanning-alert-dismissed-comment';
import { CodeScanningAlertDismissedReason } from '../models/code-scanning-alert-dismissed-reason';
import { CodeScanningAlertInstance } from '../models/code-scanning-alert-instance';
import { CodeScanningAlertRule } from '../models/code-scanning-alert-rule';
import { CodeScanningAlertState } from '../models/code-scanning-alert-state';
import { CodeScanningAnalysisTool } from '../models/code-scanning-analysis-tool';
import { NullableSimpleUser } from '../models/nullable-simple-user';
export interface CodeScanningAlert {
  created_at: AlertCreatedAt;
  dismissed_at: null | AlertDismissedAt;
  dismissed_by: null | NullableSimpleUser;
  dismissed_comment?: null | CodeScanningAlertDismissedComment;
  dismissed_reason: null | CodeScanningAlertDismissedReason;
  fixed_at?: null | AlertFixedAt;
  html_url: AlertHtmlUrl;
  instances_url: AlertInstancesUrl;
  most_recent_instance: CodeScanningAlertInstance;
  number: AlertNumber;
  rule: CodeScanningAlertRule;
  state: CodeScanningAlertState;
  tool: CodeScanningAnalysisTool;
  updated_at?: AlertUpdatedAt;
  url: AlertUrl;
}
