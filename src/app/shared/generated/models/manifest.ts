/* tslint:disable */
/* eslint-disable */
import { Dependency } from '../models/dependency';
import { Metadata } from '../models/metadata';
export interface Manifest {
  file?: {

/**
 * The path of the manifest file relative to the root of the Git repository.
 */
'source_location'?: string;
};
  metadata?: Metadata;

  /**
   * The name of the manifest.
   */
  name: string;

  /**
   * A collection of resolved package dependencies.
   */
  resolved?: {
[key: string]: Dependency;
};
}
