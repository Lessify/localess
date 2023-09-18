/* tslint:disable */
/* eslint-disable */
import { Repository } from '../models/repository';

/**
 * Starred Repository
 */
export interface StarredRepository {
  repo: Repository;
  starred_at: string;
}
