/* tslint:disable */
/* eslint-disable */
import { NullableMinimalRepository } from '../models/nullable-minimal-repository';
import { NullableSimpleUser } from '../models/nullable-simple-user';

/**
 * A software package
 */
export interface Package {
  created_at: string;
  html_url: string;

  /**
   * Unique identifier of the package.
   */
  id: number;

  /**
   * The name of the package.
   */
  name: string;
  owner?: null | NullableSimpleUser;
  package_type: 'npm' | 'maven' | 'rubygems' | 'docker' | 'nuget' | 'container';
  repository?: null | NullableMinimalRepository;
  updated_at: string;
  url: string;

  /**
   * The number of versions of the package.
   */
  version_count: number;
  visibility: 'private' | 'public';
}
