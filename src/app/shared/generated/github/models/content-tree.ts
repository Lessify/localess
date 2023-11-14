/* tslint:disable */
/* eslint-disable */

/**
 * Content Tree
 */
export interface ContentTree {
  '_links': {
'git': string | null;
'html': string | null;
'self': string;
};
  download_url: string | null;
  entries?: Array<{
'type': string;
'size': number;
'name': string;
'path': string;
'content'?: string;
'sha': string;
'url': string;
'git_url': string | null;
'html_url': string | null;
'download_url': string | null;
'_links': {
'git': string | null;
'html': string | null;
'self': string;
};
}>;
  git_url: string | null;
  html_url: string | null;
  name: string;
  path: string;
  sha: string;
  size: number;
  type: string;
  url: string;
}
