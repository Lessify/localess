/* tslint:disable */
/* eslint-disable */
import { SecurityAdvisoryCreditTypes } from '../models/security-advisory-credit-types';
import { SecurityAdvisoryEcosystems } from '../models/security-advisory-ecosystems';
export interface RepositoryAdvisoryUpdate {

  /**
   * A list of team slugs which have been granted write access to the advisory.
   */
  collaborating_teams?: null | Array<string>;

  /**
   * A list of usernames who have been granted write access to the advisory.
   */
  collaborating_users?: null | Array<string>;

  /**
   * A list of users receiving credit for their participation in the security advisory.
   */
  credits?: null | Array<{

/**
 * The username of the user credited.
 */
'login': string;
'type': SecurityAdvisoryCreditTypes;
}>;

  /**
   * The Common Vulnerabilities and Exposures (CVE) ID.
   */
  cve_id?: null | string;

  /**
   * The CVSS vector that calculates the severity of the advisory. You must choose between setting this field or `severity`.
   */
  cvss_vector_string?: null | string;

  /**
   * A list of Common Weakness Enumeration (CWE) IDs.
   */
  cwe_ids?: null | Array<string>;

  /**
   * A detailed description of what the advisory impacts.
   */
  description?: string;

  /**
   * The severity of the advisory. You must choose between setting this field or `cvss_vector_string`.
   */
  severity?: null | 'critical' | 'high' | 'medium' | 'low';

  /**
   * The state of the advisory.
   */
  state?: 'published' | 'closed' | 'draft';

  /**
   * A short summary of the advisory.
   */
  summary?: string;

  /**
   * A product affected by the vulnerability detailed in a repository security advisory.
   */
  vulnerabilities?: Array<{

/**
 * The name of the package affected by the vulnerability.
 */
'package': {
'ecosystem': SecurityAdvisoryEcosystems;

/**
 * The unique package name within its ecosystem.
 */
'name'?: string | null;
};

/**
 * The range of the package versions affected by the vulnerability.
 */
'vulnerable_version_range'?: string | null;

/**
 * The package version(s) that resolve the vulnerability.
 */
'patched_versions'?: string | null;

/**
 * The functions in the package that are affected.
 */
'vulnerable_functions'?: Array<string> | null;
}>;
}
