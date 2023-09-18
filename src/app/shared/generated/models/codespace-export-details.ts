/* tslint:disable */
/* eslint-disable */

/**
 * An export of a codespace. Also, latest export details for a codespace can be fetched with id = latest
 */
export interface CodespaceExportDetails {

  /**
   * Name of the exported branch
   */
  branch?: null | string;

  /**
   * Completion time of the last export operation
   */
  completed_at?: null | string;

  /**
   * Url for fetching export details
   */
  export_url?: string;

  /**
   * Web url for the exported branch
   */
  html_url?: null | string;

  /**
   * Id for the export details
   */
  id?: string;

  /**
   * Git commit SHA of the exported branch
   */
  sha?: null | string;

  /**
   * State of the latest export
   */
  state?: null | string;
}
