/* tslint:disable */
/* eslint-disable */

/**
 * Content File
 */
export interface ContentFile {
  '_links': {
'git': string | null;
'html': string | null;
'self': string;
};
  content: string;
  download_url: string | null;
  encoding: string;
  git_url: string | null;
  html_url: string | null;
  name: string;
  path: string;
  sha: string;
  size: number;
  submodule_git_url?: string;
  target?: string;
  type: 'file';
  url: string;
}
