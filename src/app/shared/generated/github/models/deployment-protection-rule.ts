/* tslint:disable */
/* eslint-disable */
import { CustomDeploymentRuleApp } from '../models/custom-deployment-rule-app';

/**
 * Deployment protection rule
 */
export interface DeploymentProtectionRule {
  app: CustomDeploymentRuleApp;

  /**
   * Whether the deployment protection rule is enabled for the environment.
   */
  enabled: boolean;

  /**
   * The unique identifier for the deployment protection rule.
   */
  id: number;

  /**
   * The node ID for the deployment protection rule.
   */
  node_id: string;
}
