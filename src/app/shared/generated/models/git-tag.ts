/* tslint:disable */
/* eslint-disable */
import { Verification } from '../models/verification';

/**
 * Metadata for a Git tag
 */
export interface GitTag {

  /**
   * Message describing the purpose of the tag
   */
  message: string;
  node_id: string;
  object: {
'sha': string;
'type': string;
'url': string;
};
  sha: string;

  /**
   * Name of the tag
   */
  tag: string;
  tagger: {
'date': string;
'email': string;
'name': string;
};

  /**
   * URL for the tag
   */
  url: string;
  verification?: Verification;
}
