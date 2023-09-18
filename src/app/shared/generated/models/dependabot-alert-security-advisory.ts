/* tslint:disable */
/* eslint-disable */
import { DependabotAlertSecurityVulnerability } from '../models/dependabot-alert-security-vulnerability';

/**
 * Details for the GitHub Security Advisory.
 */
export interface DependabotAlertSecurityAdvisory {

  /**
   * The unique CVE ID assigned to the advisory.
   */
  cve_id: null | string;

  /**
   * Details for the advisory pertaining to the Common Vulnerability Scoring System.
   */
  cvss: {

/**
 * The overall CVSS score of the advisory.
 */
'score': number;

/**
 * The full CVSS vector string for the advisory.
 */
'vector_string': string | null;
};

  /**
   * Details for the advisory pertaining to Common Weakness Enumeration.
   */
  cwes: Array<{

/**
 * The unique CWE ID.
 */
'cwe_id': string;

/**
 * The short, plain text name of the CWE.
 */
'name': string;
}>;

  /**
   * A long-form Markdown-supported description of the advisory.
   */
  description: string;

  /**
   * The unique GitHub Security Advisory ID assigned to the advisory.
   */
  ghsa_id: string;

  /**
   * Values that identify this advisory among security information sources.
   */
  identifiers: Array<{

/**
 * The type of advisory identifier.
 */
'type': 'CVE' | 'GHSA';

/**
 * The value of the advisory identifer.
 */
'value': string;
}>;

  /**
   * The time that the advisory was published in ISO 8601 format: `YYYY-MM-DDTHH:MM:SSZ`.
   */
  published_at: string;

  /**
   * Links to additional advisory information.
   */
  references: Array<{

/**
 * The URL of the reference.
 */
'url': string;
}>;

  /**
   * The severity of the advisory.
   */
  severity: 'low' | 'medium' | 'high' | 'critical';

  /**
   * A short, plain text summary of the advisory.
   */
  summary: string;

  /**
   * The time that the advisory was last modified in ISO 8601 format: `YYYY-MM-DDTHH:MM:SSZ`.
   */
  updated_at: string;

  /**
   * Vulnerable version range information for the advisory.
   */
  vulnerabilities: Array<DependabotAlertSecurityVulnerability>;

  /**
   * The time that the advisory was withdrawn in ISO 8601 format: `YYYY-MM-DDTHH:MM:SSZ`.
   */
  withdrawn_at: null | string;
}
