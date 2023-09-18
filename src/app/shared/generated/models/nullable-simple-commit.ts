/* tslint:disable */
/* eslint-disable */

/**
 * A commit.
 */
export type NullableSimpleCommit = {

/**
 * SHA for the commit
 */
'id': string;

/**
 * SHA for the commit's tree
 */
'tree_id': string;

/**
 * Message describing the purpose of the commit
 */
'message': string;

/**
 * Timestamp of the commit
 */
'timestamp': string;

/**
 * Information about the Git author
 */
'author': {

/**
 * Name of the commit's author
 */
'name': string;

/**
 * Git email address of the commit's author
 */
'email': string;
} | null;

/**
 * Information about the Git committer
 */
'committer': {

/**
 * Name of the commit's committer
 */
'name': string;

/**
 * Git email address of the commit's committer
 */
'email': string;
} | null;
};
