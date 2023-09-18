/* tslint:disable */
/* eslint-disable */
import { RepositoryAdvisoryCredit } from '../models/repository-advisory-credit';
import { RepositoryAdvisoryVulnerability } from '../models/repository-advisory-vulnerability';
import { SecurityAdvisoryCreditTypes } from '../models/security-advisory-credit-types';
import { SimpleRepository } from '../models/simple-repository';
import { SimpleUser } from '../models/simple-user';
import { Team } from '../models/team';

/**
 * A repository security advisory.
 */
export interface RepositoryAdvisory {

  /**
   * The author of the advisory.
   */
  author: null | SimpleUser;

  /**
   * The date and time of when the advisory was closed, in ISO 8601 format.
   */
  closed_at: null | string;

  /**
   * A list of teams that collaborate on the advisory.
   */
  collaborating_teams: null | Array<Team>;

  /**
   * A list of users that collaborate on the advisory.
   */
  collaborating_users: null | Array<SimpleUser>;

  /**
   * The date and time of when the advisory was created, in ISO 8601 format.
   */
  created_at: null | string;
  credits: null | Array<{

/**
 * The username of the user credited.
 */
'login'?: string;
'type'?: SecurityAdvisoryCreditTypes;
}>;
  credits_detailed: null | Array<RepositoryAdvisoryCredit>;

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

  /**
   * A list of only the CWE IDs.
   */
  cwe_ids: null | Array<string>;
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
   * The URL for the advisory.
   */
  html_url: string;
  identifiers: Array<{

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
   * A temporary private fork of the advisory's repository for collaborating on a fix.
   */
  private_fork: null | SimpleRepository;

  /**
   * The date and time of when the advisory was published, in ISO 8601 format.
   */
  published_at: null | string;

  /**
   * The publisher of the advisory.
   */
  publisher: null | SimpleUser;

  /**
   * The severity of the advisory.
   */
  severity: null | 'critical' | 'high' | 'medium' | 'low';

  /**
   * The state of the advisory.
   */
  state: 'published' | 'closed' | 'withdrawn' | 'draft' | 'triage';
  submission: null | {

/**
 * Whether a private vulnerability report was accepted by the repository's administrators.
 */
'accepted': boolean;
};

  /**
   * A short summary of the advisory.
   */
  summary: string;

  /**
   * The date and time of when the advisory was last updated, in ISO 8601 format.
   */
  updated_at: null | string;

  /**
   * The API URL for the advisory.
   */
  url: string;
  vulnerabilities: null | Array<RepositoryAdvisoryVulnerability>;

  /**
   * The date and time of when the advisory was withdrawn, in ISO 8601 format.
   */
  withdrawn_at: null | string;
}
