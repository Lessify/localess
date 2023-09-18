/* tslint:disable */
/* eslint-disable */

/**
 * A version of a software package
 */
export interface PackageVersion {
  created_at: string;
  deleted_at?: string;
  description?: string;
  html_url?: string;

  /**
   * Unique identifier of the package version.
   */
  id: number;
  license?: string;
  metadata?: {
'package_type': 'npm' | 'maven' | 'rubygems' | 'docker' | 'nuget' | 'container';
'container'?: {
'tags': Array<string>;
};
'docker'?: {
'tag'?: Array<string>;
};
};

  /**
   * The name of the package version.
   */
  name: string;
  package_html_url: string;
  updated_at: string;
  url: string;
}
