/* tslint:disable */
/* eslint-disable */
import { NullableCodeOfConductSimple } from '../models/nullable-code-of-conduct-simple';
import { NullableCommunityHealthFile } from '../models/nullable-community-health-file';
import { NullableLicenseSimple } from '../models/nullable-license-simple';

/**
 * Community Profile
 */
export interface CommunityProfile {
  content_reports_enabled?: boolean;
  description: null | string;
  documentation: null | string;
  files: {
'code_of_conduct': null | NullableCodeOfConductSimple;
'code_of_conduct_file': null | NullableCommunityHealthFile;
'license': null | NullableLicenseSimple;
'contributing': null | NullableCommunityHealthFile;
'readme': null | NullableCommunityHealthFile;
'issue_template': null | NullableCommunityHealthFile;
'pull_request_template': null | NullableCommunityHealthFile;
};
  health_percentage: number;
  updated_at: null | string;
}
