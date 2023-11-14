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
  description: string | null;
  documentation: string | null;
  files: {
'code_of_conduct': NullableCodeOfConductSimple | null;
'code_of_conduct_file': NullableCommunityHealthFile | null;
'license': NullableLicenseSimple | null;
'contributing': NullableCommunityHealthFile | null;
'readme': NullableCommunityHealthFile | null;
'issue_template': NullableCommunityHealthFile | null;
'pull_request_template': NullableCommunityHealthFile | null;
};
  health_percentage: number;
  updated_at: string | null;
}
