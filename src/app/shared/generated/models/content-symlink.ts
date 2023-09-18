/* tslint:disable */
/* eslint-disable */

/**
 * An object describing a symlink
 */
export interface ContentSymlink {
  '_links': {
'git': string | null;
'html': string | null;
'self': string;
};
  download_url: null | string;
  git_url: null | string;
  html_url: null | string;
  name: string;
  path: string;
  sha: string;
  size: number;
  target: string;
  type: 'symlink';
  url: string;
}
