/* tslint:disable */
/* eslint-disable */

/**
 * File Commit
 */
export interface FileCommit {
  commit: {
'sha'?: string;
'node_id'?: string;
'url'?: string;
'html_url'?: string;
'author'?: {
'date'?: string;
'name'?: string;
'email'?: string;
};
'committer'?: {
'date'?: string;
'name'?: string;
'email'?: string;
};
'message'?: string;
'tree'?: {
'url'?: string;
'sha'?: string;
};
'parents'?: Array<{
'url'?: string;
'html_url'?: string;
'sha'?: string;
}>;
'verification'?: {
'verified'?: boolean;
'reason'?: string;
'signature'?: string | null;
'payload'?: string | null;
};
};
  content: ({
'name'?: string;
'path'?: string;
'sha'?: string;
'size'?: number;
'url'?: string;
'html_url'?: string;
'git_url'?: string;
'download_url'?: string;
'type'?: string;
'_links'?: {
'self'?: string;
'git'?: string;
'html'?: string;
};
}) | null;
}
