/* tslint:disable */
/* eslint-disable */
import { Metadata } from '../models/metadata';
export interface Dependency {

  /**
   * Array of package-url (PURLs) of direct child dependencies.
   */
  dependencies?: Array<string>;
  metadata?: Metadata;

  /**
   * Package-url (PURL) of dependency. See https://github.com/package-url/purl-spec for more details.
   */
  package_url?: string;

  /**
   * A notation of whether a dependency is requested directly by this manifest or is a dependency of another dependency.
   */
  relationship?: 'direct' | 'indirect';

  /**
   * A notation of whether the dependency is required for the primary build artifact (runtime) or is only used for development. Future versions of this specification may allow for more granular scopes.
   */
  scope?: 'runtime' | 'development';
}
