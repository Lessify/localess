/* tslint:disable */
/* eslint-disable */

/**
 * A list of directory items
 */
export type ContentDirectory = Array<{
'type': 'dir' | 'file' | 'submodule' | 'symlink';
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
