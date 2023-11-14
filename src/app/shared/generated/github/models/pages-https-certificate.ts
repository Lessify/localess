/* tslint:disable */
/* eslint-disable */
export interface PagesHttpsCertificate {
  description: string;

  /**
   * Array of the domain set and its alternate name (if it is configured)
   */
  domains: Array<string>;
  expires_at?: string;
  state: 'new' | 'authorization_created' | 'authorization_pending' | 'authorized' | 'authorization_revoked' | 'issued' | 'uploaded' | 'approved' | 'errored' | 'bad_authz' | 'destroy_pending' | 'dns_changed';
}
