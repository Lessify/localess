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
  download_url: string | null;
  git_url: string | null;
  html_url: string | null;
  name: string;
  path: string;
  sha: string;
  size: number;
  target: string;
  type: 'symlink';
  url: string;
}
