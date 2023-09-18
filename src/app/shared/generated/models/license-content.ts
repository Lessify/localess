/* tslint:disable */
/* eslint-disable */
import { NullableLicenseSimple } from '../models/nullable-license-simple';

/**
 * License Content
 */
export interface LicenseContent {
  '_links': {
'git': string | null;
'html': string | null;
'self': string;
};
  content: string;
  download_url: null | string;
  encoding: string;
  git_url: null | string;
  html_url: null | string;
  license: null | NullableLicenseSimple;
  name: string;
  path: string;
  sha: string;
  size: number;
  type: string;
  url: string;
}
