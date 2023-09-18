/* tslint:disable */
/* eslint-disable */

/**
 * An object describing a submodule
 */
export interface ContentSubmodule {
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
  submodule_git_url: string;
  type: 'submodule';
  url: string;
}
