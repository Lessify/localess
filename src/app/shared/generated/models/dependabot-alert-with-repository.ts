/* tslint:disable */
/* eslint-disable */
import { AlertAutoDismissedAt } from '../models/alert-auto-dismissed-at';
import { AlertCreatedAt } from '../models/alert-created-at';
import { AlertDismissedAt } from '../models/alert-dismissed-at';
import { AlertFixedAt } from '../models/alert-fixed-at';
import { AlertHtmlUrl } from '../models/alert-html-url';
import { AlertNumber } from '../models/alert-number';
import { AlertUpdatedAt } from '../models/alert-updated-at';
import { AlertUrl } from '../models/alert-url';
import { DependabotAlertPackage } from '../models/dependabot-alert-package';
import { DependabotAlertSecurityAdvisory } from '../models/dependabot-alert-security-advisory';
import { DependabotAlertSecurityVulnerability } from '../models/dependabot-alert-security-vulnerability';
import { NullableSimpleUser } from '../models/nullable-simple-user';
import { SimpleRepository } from '../models/simple-repository';

/**
 * A Dependabot alert.
 */
export interface DependabotAlertWithRepository {
  auto_dismissed_at?: null | AlertAutoDismissedAt;
  created_at: AlertCreatedAt;

  /**
   * Details for the vulnerable dependency.
   */
  dependency: {
'package'?: DependabotAlertPackage;

/**
 * The full path to the dependency manifest file, relative to the root of the repository.
 */
'manifest_path'?: string;

/**
 * The execution scope of the vulnerable dependency.
 */
'scope'?: 'development' | 'runtime' | null;
};
  dismissed_at: null | AlertDismissedAt;
  dismissed_by: null | NullableSimpleUser;

  /**
   * An optional comment associated with the alert's dismissal.
   */
  dismissed_comment: null | string;

  /**
   * The reason that the alert was dismissed.
   */
  dismissed_reason: null | 'fix_started' | 'inaccurate' | 'no_bandwidth' | 'not_used' | 'tolerable_risk';
  fixed_at: null | AlertFixedAt;
  html_url: AlertHtmlUrl;
  number: AlertNumber;
  repository: SimpleRepository;
  security_advisory: DependabotAlertSecurityAdvisory;
  security_vulnerability: DependabotAlertSecurityVulnerability;

  /**
   * The state of the Dependabot alert.
   */
  state: 'auto_dismissed' | 'dismissed' | 'fixed' | 'open';
  updated_at: AlertUpdatedAt;
  url: AlertUrl;
}
