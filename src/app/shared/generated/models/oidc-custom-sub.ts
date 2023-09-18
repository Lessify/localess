/* tslint:disable */
/* eslint-disable */

/**
 * Actions OIDC Subject customization
 */
export interface OidcCustomSub {

  /**
   * Array of unique strings. Each claim key can only contain alphanumeric characters and underscores.
   */
  include_claim_keys: Array<string>;
}
