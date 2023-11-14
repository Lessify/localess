/* tslint:disable */
/* eslint-disable */
import { NullableSimpleUser } from '../models/nullable-simple-user';

/**
 * Contributor Activity
 */
export interface ContributorActivity {
  author: NullableSimpleUser | null;
  total: number;
  weeks: Array<{
'w'?: number;
'a'?: number;
'd'?: number;
'c'?: number;
}>;
}
