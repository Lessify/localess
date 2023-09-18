/* tslint:disable */
/* eslint-disable */

/**
 * Color-coded labels help you categorize and filter your issues (just like labels in Gmail).
 */
export interface Label {

  /**
   * 6-character hex code, without the leading #, identifying the color
   */
  color: string;
  default: boolean;
  description: null | string;
  id: number;

  /**
   * The name of the label.
   */
  name: string;
  node_id: string;

  /**
   * URL for the label
   */
  url: string;
}
