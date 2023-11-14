/* tslint:disable */
/* eslint-disable */
import { SimpleUser } from '../models/simple-user';

/**
 * The status of auto merging a pull request.
 */
export type AutoMerge = ({
'enabled_by': SimpleUser;

/**
 * The merge method to use.
 */
'merge_method': 'merge' | 'squash' | 'rebase';

/**
 * Title for the merge commit message.
 */
'commit_title': string;

/**
 * Commit message for the merge commit.
 */
'commit_message': string;
}) | null;
