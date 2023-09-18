/* tslint:disable */
/* eslint-disable */

/**
 * A list of errors found in a repo's CODEOWNERS file
 */
export interface CodeownersErrors {
  errors: Array<{

/**
 * The line number where this errors occurs.
 */
'line': number;

/**
 * The column number where this errors occurs.
 */
'column': number;

/**
 * The contents of the line where the error occurs.
 */
'source'?: string;

/**
 * The type of error.
 */
'kind': string;

/**
 * Suggested action to fix the error. This will usually be `null`, but is provided for some common errors.
 */
'suggestion'?: string | null;

/**
 * A human-readable description of the error, combining information from multiple fields, laid out for display in a monospaced typeface (for example, a command-line setting).
 */
'message': string;

/**
 * The path of the file where the error occured.
 */
'path': string;
}>;
}
