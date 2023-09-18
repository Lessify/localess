/* tslint:disable */
/* eslint-disable */
import { SimpleUser } from '../models/simple-user';

/**
 * A CodeQL database.
 */
export interface CodeScanningCodeqlDatabase {

  /**
   * The MIME type of the CodeQL database file.
   */
  content_type: string;

  /**
   * The date and time at which the CodeQL database was created, in ISO 8601 format':' YYYY-MM-DDTHH:MM:SSZ.
   */
  created_at: string;

  /**
   * The ID of the CodeQL database.
   */
  id: number;

  /**
   * The language of the CodeQL database.
   */
  language: string;

  /**
   * The name of the CodeQL database.
   */
  name: string;

  /**
   * The size of the CodeQL database file in bytes.
   */
  size: number;

  /**
   * The date and time at which the CodeQL database was last updated, in ISO 8601 format':' YYYY-MM-DDTHH:MM:SSZ.
   */
  updated_at: string;
  uploader: SimpleUser;

  /**
   * The URL at which to download the CodeQL database. The `Accept` header must be set to the value of the `content_type` property.
   */
  url: string;
}
