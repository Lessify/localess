/* tslint:disable */
/* eslint-disable */
import { AuthorAssociation } from '../models/author-association';
import { NullableIntegration } from '../models/nullable-integration';
import { NullableMilestone } from '../models/nullable-milestone';
import { NullableSimpleUser } from '../models/nullable-simple-user';
import { ReactionRollup } from '../models/reaction-rollup';
import { Repository } from '../models/repository';
import { SimpleUser } from '../models/simple-user';

/**
 * Issues are a great way to keep track of tasks, enhancements, and bugs for your projects.
 */
export type NullableIssue = {
'id': number;
'node_id': string;

/**
 * URL for the issue
 */
'url': string;
'repository_url': string;
'labels_url': string;
'comments_url': string;
'events_url': string;
'html_url': string;

/**
 * Number uniquely identifying the issue within its repository
 */
'number': number;

/**
 * State of the issue; either 'open' or 'closed'
 */
'state': string;

/**
 * The reason for the current state
 */
'state_reason'?: 'completed' | 'reopened' | 'not_planned' | null;

/**
 * Title of the issue
 */
'title': string;

/**
 * Contents of the issue
 */
'body'?: string | null;
'user': null | NullableSimpleUser;

/**
 * Labels to associate with this issue; pass one or more label names to replace the set of labels on this issue; send an empty array to clear all labels from the issue; note that the labels are silently dropped for users without push access to the repository
 */
'labels': Array<(string | {
'id'?: number;
'node_id'?: string;
'url'?: string;
'name'?: string;
'description'?: string | null;
'color'?: string | null;
'default'?: boolean;
})>;
'assignee': null | NullableSimpleUser;
'assignees'?: Array<SimpleUser> | null;
'milestone': null | NullableMilestone;
'locked': boolean;
'active_lock_reason'?: string | null;
'comments': number;
'pull_request'?: {
'merged_at'?: string | null;
'diff_url': string | null;
'html_url': string | null;
'patch_url': string | null;
'url': string | null;
};
'closed_at': string | null;
'created_at': string;
'updated_at': string;
'draft'?: boolean;
'closed_by'?: null | NullableSimpleUser;
'body_html'?: string;
'body_text'?: string;
'timeline_url'?: string;
'repository'?: Repository;
'performed_via_github_app'?: null | NullableIntegration;
'author_association': AuthorAssociation;
'reactions'?: ReactionRollup;
};
