/* tslint:disable */
/* eslint-disable */

/**
 * Configuration for code scanning default setup.
 */
export interface CodeScanningDefaultSetup {

  /**
   * Languages to be analysed.
   */
  languages?: Array<'c-cpp' | 'csharp' | 'go' | 'java-kotlin' | 'javascript-typescript' | 'javascript' | 'python' | 'ruby' | 'typescript' | 'swift'>;

  /**
   * CodeQL query suite to be used.
   */
  query_suite?: 'default' | 'extended';

  /**
   * The frequency of the periodic analysis.
   */
  schedule?: null | 'weekly';

  /**
   * Code scanning default setup has been configured or not.
   */
  state?: 'configured' | 'not-configured';

  /**
   * Timestamp of latest configuration update.
   */
  updated_at?: null | string;
}
