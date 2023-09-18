/* tslint:disable */
/* eslint-disable */
import { RateLimit } from '../models/rate-limit';

/**
 * Rate Limit Overview
 */
export interface RateLimitOverview {
  rate: RateLimit;
  resources: {
'core': RateLimit;
'graphql'?: RateLimit;
'search': RateLimit;
'code_search'?: RateLimit;
'source_import'?: RateLimit;
'integration_manifest'?: RateLimit;
'code_scanning_upload'?: RateLimit;
'actions_runner_registration'?: RateLimit;
'scim'?: RateLimit;
'dependency_snapshots'?: RateLimit;
};
}
