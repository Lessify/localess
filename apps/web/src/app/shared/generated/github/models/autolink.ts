/* tslint:disable */
/* eslint-disable */

/**
 * An autolink reference.
 */
export interface Autolink {
  id: number;

  /**
   * Whether this autolink reference matches alphanumeric characters. If false, this autolink reference only matches numeric characters.
   */
  is_alphanumeric: boolean;

  /**
   * The prefix of a key that is linkified.
   */
  key_prefix: string;

  /**
   * A template for the target URL that is generated if a key was found.
   */
  url_template: string;
}
