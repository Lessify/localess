/* tslint:disable */
/* eslint-disable */

/**
 * Timeline Committed Event
 */
export interface TimelineCommittedEvent {

  /**
   * Identifying information for the git-user
   */
  author: {

/**
 * Timestamp of the commit
 */
'date': string;

/**
 * Git email address of the user
 */
'email': string;

/**
 * Name of the git user
 */
'name': string;
};

  /**
   * Identifying information for the git-user
   */
  committer: {

/**
 * Timestamp of the commit
 */
'date': string;

/**
 * Git email address of the user
 */
'email': string;

/**
 * Name of the git user
 */
'name': string;
};
  event?: string;
  html_url: string;

  /**
   * Message describing the purpose of the commit
   */
  message: string;
  node_id: string;
  parents: Array<{

/**
 * SHA for the commit
 */
'sha': string;
'url': string;
'html_url': string;
}>;

  /**
   * SHA for the commit
   */
  sha: string;
  tree: {

/**
 * SHA for the commit
 */
'sha': string;
'url': string;
};
  url: string;
  verification: {
'verified': boolean;
'reason': string;
'signature': string | null;
'payload': string | null;
};
}
