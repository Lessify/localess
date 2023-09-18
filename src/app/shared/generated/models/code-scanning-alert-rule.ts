/* tslint:disable */
/* eslint-disable */
export interface CodeScanningAlertRule {

  /**
   * A short description of the rule used to detect the alert.
   */
  description?: string;

  /**
   * description of the rule used to detect the alert.
   */
  full_description?: string;

  /**
   * Detailed documentation for the rule as GitHub Flavored Markdown.
   */
  help?: null | string;

  /**
   * A link to the documentation for the rule used to detect the alert.
   */
  help_uri?: null | string;

  /**
   * A unique identifier for the rule used to detect the alert.
   */
  id?: null | string;

  /**
   * The name of the rule used to detect the alert.
   */
  name?: string;

  /**
   * The security severity of the alert.
   */
  security_severity_level?: null | 'low' | 'medium' | 'high' | 'critical';

  /**
   * The severity of the alert.
   */
  severity?: null | 'none' | 'note' | 'warning' | 'error';

  /**
   * A set of tags applicable for the rule.
   */
  tags?: null | Array<string>;
}
