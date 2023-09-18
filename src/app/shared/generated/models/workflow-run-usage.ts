/* tslint:disable */
/* eslint-disable */

/**
 * Workflow Run Usage
 */
export interface WorkflowRunUsage {
  billable: {
'UBUNTU'?: {
'total_ms': number;
'jobs': number;
'job_runs'?: Array<{
'job_id': number;
'duration_ms': number;
}>;
};
'MACOS'?: {
'total_ms': number;
'jobs': number;
'job_runs'?: Array<{
'job_id': number;
'duration_ms': number;
}>;
};
'WINDOWS'?: {
'total_ms': number;
'jobs': number;
'job_runs'?: Array<{
'job_id': number;
'duration_ms': number;
}>;
};
};
  run_duration_ms?: number;
}
