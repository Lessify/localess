/* tslint:disable */
/* eslint-disable */

/**
 * Api Overview
 */
export interface ApiOverview {
  actions?: Array<string>;
  api?: Array<string>;
  dependabot?: Array<string>;
  domains?: {
'website'?: Array<string>;
'codespaces'?: Array<string>;
'copilot'?: Array<string>;
'packages'?: Array<string>;
};
  git?: Array<string>;
  github_enterprise_importer?: Array<string>;
  hooks?: Array<string>;
  importer?: Array<string>;
  packages?: Array<string>;
  pages?: Array<string>;
  ssh_key_fingerprints?: {
'SHA256_RSA'?: string;
'SHA256_DSA'?: string;
'SHA256_ECDSA'?: string;
'SHA256_ED25519'?: string;
};
  ssh_keys?: Array<string>;
  verifiable_password_authentication: boolean;
  web?: Array<string>;
}
