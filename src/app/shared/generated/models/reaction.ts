/* tslint:disable */
/* eslint-disable */
import { NullableSimpleUser } from '../models/nullable-simple-user';

/**
 * Reactions to conversations provide a way to help people express their feelings more simply and effectively.
 */
export interface Reaction {

  /**
   * The reaction to use
   */
  content: '+1' | '-1' | 'laugh' | 'confused' | 'heart' | 'hooray' | 'rocket' | 'eyes';
  created_at: string;
  id: number;
  node_id: string;
  user: null | NullableSimpleUser;
}
