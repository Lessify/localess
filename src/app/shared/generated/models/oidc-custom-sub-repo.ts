/* tslint:disable */
/* eslint-disable */

/**
 * Actions OIDC subject customization for a repository
 */
export interface OidcCustomSubRepo {

  /**
   * Array of unique strings. Each claim key can only contain alphanumeric characters and underscores.
   */
  include_claim_keys?: Array<string>;

  /**
   * Whether to use the default template or not. If `true`, the `include_claim_keys` field is ignored.
   */
  use_default: boolean;
}
