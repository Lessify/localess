/* tslint:disable */
/* eslint-disable */
export interface CodeScanningAlertRuleSummary {

  /**
   * A short description of the rule used to detect the alert.
   */
  description?: string;

  /**
   * A unique identifier for the rule used to detect the alert.
   */
  id?: null | string;

  /**
   * The name of the rule used to detect the alert.
   */
  name?: string;

  /**
   * The severity of the alert.
   */
  severity?: null | 'none' | 'note' | 'warning' | 'error';

  /**
   * A set of tags applicable for the rule.
   */
  tags?: null | Array<string>;
}
