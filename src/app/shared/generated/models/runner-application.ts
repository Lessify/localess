/* tslint:disable */
/* eslint-disable */

/**
 * Runner Application
 */
export interface RunnerApplication {
  architecture: string;
  download_url: string;
  filename: string;
  os: string;
  sha256_checksum?: string;

  /**
   * A short lived bearer token used to download the runner, if needed.
   */
  temp_download_token?: string;
}
