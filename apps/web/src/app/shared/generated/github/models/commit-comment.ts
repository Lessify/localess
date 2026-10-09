/* tslint:disable */
/* eslint-disable */
import { AuthorAssociation } from '../models/author-association';
import { NullableSimpleUser } from '../models/nullable-simple-user';
import { ReactionRollup } from '../models/reaction-rollup';

/**
 * Commit Comment
 */
export interface CommitComment {
  author_association: AuthorAssociation;
  body: string;
  commit_id: string;
  created_at: string;
  html_url: string;
  id: number;
  line: number | null;
  node_id: string;
  path: string | null;
  position: number | null;
  reactions?: ReactionRollup;
  updated_at: string;
  url: string;
  user: NullableSimpleUser | null;
}
