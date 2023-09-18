/* tslint:disable */
/* eslint-disable */

/**
 * An enterprise on GitHub.
 */
export interface Enterprise {
  avatar_url: string;
  created_at: null | string;

  /**
   * A short description of the enterprise.
   */
  description?: null | string;
  html_url: string;

  /**
   * Unique identifier of the enterprise
   */
  id: number;

  /**
   * The name of the enterprise.
   */
  name: string;
  node_id: string;

  /**
   * The slug url identifier for the enterprise.
   */
  slug: string;
  updated_at: null | string;

  /**
   * The enterprise's website URL.
   */
  website_url?: null | string;
}
