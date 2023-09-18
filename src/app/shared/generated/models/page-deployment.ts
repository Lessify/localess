/* tslint:disable */
/* eslint-disable */

/**
 * The GitHub Pages deployment status.
 */
export interface PageDeployment {

  /**
   * The URI to the deployed GitHub Pages.
   */
  page_url: string;

  /**
   * The URI to the deployed GitHub Pages preview.
   */
  preview_url?: string;

  /**
   * The URI to monitor GitHub Pages deployment status.
   */
  status_url: string;
}
