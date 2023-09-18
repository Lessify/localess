/* tslint:disable */
/* eslint-disable */
import { SecurityAdvisoryCreditTypes } from '../models/security-advisory-credit-types';
import { SecurityAdvisoryEcosystems } from '../models/security-advisory-ecosystems';
import { SimpleUser } from '../models/simple-user';

/**
 * A GitHub Security Advisory.
 */
export interface GlobalAdvisory {

  /**
   * The users who contributed to the advisory.
   */
  credits: null | Array<{
'user': SimpleUser;
'type': SecurityAdvisoryCreditTypes;
}>;

  /**
   * The Common Vulnerabilities and Exposures (CVE) ID.
   */
  cve_id: null | string;
  cvss: null | {

/**
 * The CVSS vector.
 */
'vector_string': string | null;

/**
 * The CVSS score.
 */
'score': number | null;
};
  cwes: null | Array<{

/**
 * The Common Weakness Enumeration (CWE) identifier.
 */
'cwe_id': string;

/**
 * The name of the CWE.
 */
'name': string;
}>;

  /**
   * A detailed description of what the advisory entails.
   */
  description: null | string;

  /**
   * The GitHub Security Advisory ID.
   */
  ghsa_id: string;

  /**
   * The date and time of when the advisory was reviewed by GitHub, in ISO 8601 format.
   */
  github_reviewed_at: null | string;

  /**
   * The URL for the advisory.
   */
  html_url: string;
  identifiers: null | Array<{

/**
 * The type of identifier.
 */
'type': 'CVE' | 'GHSA';

/**
 * The identifier value.
 */
'value': string;
}>;

  /**
   * The date and time when the advisory was published in the National Vulnerability Database, in ISO 8601 format.
   * This field is only populated when the advisory is imported from the National Vulnerability Database.
   */
  nvd_published_at: null | string;

  /**
   * The date and time of when the advisory was published, in ISO 8601 format.
   */
  published_at: string;
  references: null | Array<string>;

  /**
   * The API URL for the repository advisory.
   */
  repository_advisory_url: null | string;

  /**
   * The severity of the advisory.
   */
  severity: 'critical' | 'high' | 'medium' | 'low' | 'unknown';

  /**
   * The URL of the advisory's source code.
   */
  source_code_location: null | string;

  /**
   * A short summary of the advisory.
   */
  summary: string;

  /**
   * The type of advisory.
   */
  type: 'reviewed' | 'unreviewed' | 'malware';

  /**
   * The date and time of when the advisory was last updated, in ISO 8601 format.
   */
  updated_at: string;

  /**
   * The API URL for the advisory.
   */
  url: string;

  /**
   * The products and respective version ranges affected by the advisory.
   */
  vulnerabilities: null | Array<{

/**
 * The name of the package affected by the vulnerability.
 */
'package': {
'ecosystem': SecurityAdvisoryEcosystems;

/**
 * The unique package name within its ecosystem.
 */
'name': string | null;
} | null;

/**
 * The range of the package versions affected by the vulnerability.
 */
'vulnerable_version_range': string | null;

/**
 * The package version that resolve the vulnerability.
 */
'first_patched_version': string | null;

/**
 * The functions in the package that are affected by the vulnerability.
 */
'vulnerable_functions': Array<string> | null;
}>;

  /**
   * The date and time of when the advisory was withdrawn, in ISO 8601 format.
   */
  withdrawn_at: null | string;
}
