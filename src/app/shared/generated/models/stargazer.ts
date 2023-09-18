/* tslint:disable */
/* eslint-disable */
import { NullableSimpleUser } from '../models/nullable-simple-user';

/**
 * Stargazer
 */
export interface Stargazer {
  starred_at: string;
  user: null | NullableSimpleUser;
}
