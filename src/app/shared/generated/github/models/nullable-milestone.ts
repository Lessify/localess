/* tslint:disable */
/* eslint-disable */
import { NullableSimpleUser } from '../models/nullable-simple-user';

/**
 * A collection of related issues and pull requests.
 */
export type NullableMilestone = {
'url': string;
'html_url': string;
'labels_url': string;
'id': number;
'node_id': string;

/**
 * The number of the milestone.
 */
'number': number;

/**
 * The state of the milestone.
 */
'state': 'open' | 'closed';

/**
 * The title of the milestone.
 */
'title': string;
'description': string | null;
'creator': NullableSimpleUser | null;
'open_issues': number;
'closed_issues': number;
'created_at': string;
'updated_at': string;
'closed_at': string | null;
'due_on': string | null;
};
