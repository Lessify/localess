/* tslint:disable */
/* eslint-disable */

/**
 * Configuration for code scanning default setup.
 */
export interface CodeScanningDefaultSetupUpdate {

  /**
   * CodeQL languages to be analyzed. Supported values are: `c-cpp`, `csharp`, `go`, `java-kotlin`, `javascript-typescript`, `python`, `ruby`, and `swift`.
   */
  languages?: Array<'c-cpp' | 'csharp' | 'go' | 'java-kotlin' | 'javascript-typescript' | 'python' | 'ruby' | 'swift'>;

  /**
   * CodeQL query suite to be used.
   */
  query_suite?: 'default' | 'extended';

  /**
   * Whether code scanning default setup has been configured or not.
   */
  state: 'configured' | 'not-configured';
}
