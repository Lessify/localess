/* tslint:disable */
/* eslint-disable */
import { AuthorAssociation } from '../models/author-association';
import { NullableSimpleUser } from '../models/nullable-simple-user';

/**
 * A comment made to a gist.
 */
export interface GistComment {
  author_association: AuthorAssociation;

  /**
   * The comment text.
   */
  body: string;
  created_at: string;
  id: number;
  node_id: string;
  updated_at: string;
  url: string;
  user: null | NullableSimpleUser;
}
