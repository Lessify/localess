/* tslint:disable */
/* eslint-disable */
export interface SelectedActions {

  /**
   * Whether GitHub-owned actions are allowed. For example, this includes the actions in the `actions` organization.
   */
  github_owned_allowed?: boolean;

  /**
   * Specifies a list of string-matching patterns to allow specific action(s) and reusable workflow(s). Wildcards, tags, and SHAs are allowed. For example, `monalisa/octocat@*`, `monalisa/octocat@v2`, `monalisa/*`.
   *
   * **Note**: The `patterns_allowed` setting only applies to public repositories.
   */
  patterns_allowed?: Array<string>;

  /**
   * Whether actions from GitHub Marketplace verified creators are allowed. Set to `true` to allow all actions by GitHub Marketplace verified creators.
   */
  verified_allowed?: boolean;
}
