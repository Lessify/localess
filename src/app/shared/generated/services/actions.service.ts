/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { BaseService } from '../base-service';
import { ApiConfiguration } from '../api-configuration';
import { StrictHttpResponse } from '../strict-http-response';

import { ActionsCacheList } from '../models/actions-cache-list';
import { ActionsCacheUsageByRepository } from '../models/actions-cache-usage-by-repository';
import { ActionsCacheUsageOrgEnterprise } from '../models/actions-cache-usage-org-enterprise';
import { ActionsGetDefaultWorkflowPermissions } from '../models/actions-get-default-workflow-permissions';
import { ActionsOrganizationPermissions } from '../models/actions-organization-permissions';
import { ActionsPublicKey } from '../models/actions-public-key';
import { ActionsRepositoryPermissions } from '../models/actions-repository-permissions';
import { ActionsSecret } from '../models/actions-secret';
import { ActionsVariable } from '../models/actions-variable';
import { ActionsWorkflowAccessToRepository } from '../models/actions-workflow-access-to-repository';
import { actionsAddCustomLabelsToSelfHostedRunnerForOrg } from '../fn/actions/actions-add-custom-labels-to-self-hosted-runner-for-org';
import { ActionsAddCustomLabelsToSelfHostedRunnerForOrg$Params } from '../fn/actions/actions-add-custom-labels-to-self-hosted-runner-for-org';
import { actionsAddCustomLabelsToSelfHostedRunnerForRepo } from '../fn/actions/actions-add-custom-labels-to-self-hosted-runner-for-repo';
import { ActionsAddCustomLabelsToSelfHostedRunnerForRepo$Params } from '../fn/actions/actions-add-custom-labels-to-self-hosted-runner-for-repo';
import { actionsAddSelectedRepoToOrgSecret } from '../fn/actions/actions-add-selected-repo-to-org-secret';
import { ActionsAddSelectedRepoToOrgSecret$Params } from '../fn/actions/actions-add-selected-repo-to-org-secret';
import { actionsAddSelectedRepoToOrgVariable } from '../fn/actions/actions-add-selected-repo-to-org-variable';
import { ActionsAddSelectedRepoToOrgVariable$Params } from '../fn/actions/actions-add-selected-repo-to-org-variable';
import { actionsApproveWorkflowRun } from '../fn/actions/actions-approve-workflow-run';
import { ActionsApproveWorkflowRun$Params } from '../fn/actions/actions-approve-workflow-run';
import { actionsCancelWorkflowRun } from '../fn/actions/actions-cancel-workflow-run';
import { ActionsCancelWorkflowRun$Params } from '../fn/actions/actions-cancel-workflow-run';
import { actionsCreateEnvironmentVariable } from '../fn/actions/actions-create-environment-variable';
import { ActionsCreateEnvironmentVariable$Params } from '../fn/actions/actions-create-environment-variable';
import { actionsCreateOrgVariable } from '../fn/actions/actions-create-org-variable';
import { ActionsCreateOrgVariable$Params } from '../fn/actions/actions-create-org-variable';
import { actionsCreateOrUpdateEnvironmentSecret } from '../fn/actions/actions-create-or-update-environment-secret';
import { ActionsCreateOrUpdateEnvironmentSecret$Params } from '../fn/actions/actions-create-or-update-environment-secret';
import { actionsCreateOrUpdateOrgSecret } from '../fn/actions/actions-create-or-update-org-secret';
import { ActionsCreateOrUpdateOrgSecret$Params } from '../fn/actions/actions-create-or-update-org-secret';
import { actionsCreateOrUpdateRepoSecret } from '../fn/actions/actions-create-or-update-repo-secret';
import { ActionsCreateOrUpdateRepoSecret$Params } from '../fn/actions/actions-create-or-update-repo-secret';
import { actionsCreateRegistrationTokenForOrg } from '../fn/actions/actions-create-registration-token-for-org';
import { ActionsCreateRegistrationTokenForOrg$Params } from '../fn/actions/actions-create-registration-token-for-org';
import { actionsCreateRegistrationTokenForRepo } from '../fn/actions/actions-create-registration-token-for-repo';
import { ActionsCreateRegistrationTokenForRepo$Params } from '../fn/actions/actions-create-registration-token-for-repo';
import { actionsCreateRemoveTokenForOrg } from '../fn/actions/actions-create-remove-token-for-org';
import { ActionsCreateRemoveTokenForOrg$Params } from '../fn/actions/actions-create-remove-token-for-org';
import { actionsCreateRemoveTokenForRepo } from '../fn/actions/actions-create-remove-token-for-repo';
import { ActionsCreateRemoveTokenForRepo$Params } from '../fn/actions/actions-create-remove-token-for-repo';
import { actionsCreateRepoVariable } from '../fn/actions/actions-create-repo-variable';
import { ActionsCreateRepoVariable$Params } from '../fn/actions/actions-create-repo-variable';
import { actionsCreateWorkflowDispatch } from '../fn/actions/actions-create-workflow-dispatch';
import { ActionsCreateWorkflowDispatch$Params } from '../fn/actions/actions-create-workflow-dispatch';
import { actionsDeleteActionsCacheById } from '../fn/actions/actions-delete-actions-cache-by-id';
import { ActionsDeleteActionsCacheById$Params } from '../fn/actions/actions-delete-actions-cache-by-id';
import { actionsDeleteActionsCacheByKey } from '../fn/actions/actions-delete-actions-cache-by-key';
import { ActionsDeleteActionsCacheByKey$Params } from '../fn/actions/actions-delete-actions-cache-by-key';
import { actionsDeleteArtifact } from '../fn/actions/actions-delete-artifact';
import { ActionsDeleteArtifact$Params } from '../fn/actions/actions-delete-artifact';
import { actionsDeleteEnvironmentSecret } from '../fn/actions/actions-delete-environment-secret';
import { ActionsDeleteEnvironmentSecret$Params } from '../fn/actions/actions-delete-environment-secret';
import { actionsDeleteEnvironmentVariable } from '../fn/actions/actions-delete-environment-variable';
import { ActionsDeleteEnvironmentVariable$Params } from '../fn/actions/actions-delete-environment-variable';
import { actionsDeleteOrgSecret } from '../fn/actions/actions-delete-org-secret';
import { ActionsDeleteOrgSecret$Params } from '../fn/actions/actions-delete-org-secret';
import { actionsDeleteOrgVariable } from '../fn/actions/actions-delete-org-variable';
import { ActionsDeleteOrgVariable$Params } from '../fn/actions/actions-delete-org-variable';
import { actionsDeleteRepoSecret } from '../fn/actions/actions-delete-repo-secret';
import { ActionsDeleteRepoSecret$Params } from '../fn/actions/actions-delete-repo-secret';
import { actionsDeleteRepoVariable } from '../fn/actions/actions-delete-repo-variable';
import { ActionsDeleteRepoVariable$Params } from '../fn/actions/actions-delete-repo-variable';
import { actionsDeleteSelfHostedRunnerFromOrg } from '../fn/actions/actions-delete-self-hosted-runner-from-org';
import { ActionsDeleteSelfHostedRunnerFromOrg$Params } from '../fn/actions/actions-delete-self-hosted-runner-from-org';
import { actionsDeleteSelfHostedRunnerFromRepo } from '../fn/actions/actions-delete-self-hosted-runner-from-repo';
import { ActionsDeleteSelfHostedRunnerFromRepo$Params } from '../fn/actions/actions-delete-self-hosted-runner-from-repo';
import { actionsDeleteWorkflowRun } from '../fn/actions/actions-delete-workflow-run';
import { ActionsDeleteWorkflowRun$Params } from '../fn/actions/actions-delete-workflow-run';
import { actionsDeleteWorkflowRunLogs } from '../fn/actions/actions-delete-workflow-run-logs';
import { ActionsDeleteWorkflowRunLogs$Params } from '../fn/actions/actions-delete-workflow-run-logs';
import { actionsDisableSelectedRepositoryGithubActionsOrganization } from '../fn/actions/actions-disable-selected-repository-github-actions-organization';
import { ActionsDisableSelectedRepositoryGithubActionsOrganization$Params } from '../fn/actions/actions-disable-selected-repository-github-actions-organization';
import { actionsDisableWorkflow } from '../fn/actions/actions-disable-workflow';
import { ActionsDisableWorkflow$Params } from '../fn/actions/actions-disable-workflow';
import { actionsDownloadArtifact } from '../fn/actions/actions-download-artifact';
import { ActionsDownloadArtifact$Params } from '../fn/actions/actions-download-artifact';
import { actionsDownloadJobLogsForWorkflowRun } from '../fn/actions/actions-download-job-logs-for-workflow-run';
import { ActionsDownloadJobLogsForWorkflowRun$Params } from '../fn/actions/actions-download-job-logs-for-workflow-run';
import { actionsDownloadWorkflowRunAttemptLogs } from '../fn/actions/actions-download-workflow-run-attempt-logs';
import { ActionsDownloadWorkflowRunAttemptLogs$Params } from '../fn/actions/actions-download-workflow-run-attempt-logs';
import { actionsDownloadWorkflowRunLogs } from '../fn/actions/actions-download-workflow-run-logs';
import { ActionsDownloadWorkflowRunLogs$Params } from '../fn/actions/actions-download-workflow-run-logs';
import { actionsEnableSelectedRepositoryGithubActionsOrganization } from '../fn/actions/actions-enable-selected-repository-github-actions-organization';
import { ActionsEnableSelectedRepositoryGithubActionsOrganization$Params } from '../fn/actions/actions-enable-selected-repository-github-actions-organization';
import { actionsEnableWorkflow } from '../fn/actions/actions-enable-workflow';
import { ActionsEnableWorkflow$Params } from '../fn/actions/actions-enable-workflow';
import { actionsGenerateRunnerJitconfigForOrg } from '../fn/actions/actions-generate-runner-jitconfig-for-org';
import { ActionsGenerateRunnerJitconfigForOrg$Params } from '../fn/actions/actions-generate-runner-jitconfig-for-org';
import { actionsGenerateRunnerJitconfigForRepo } from '../fn/actions/actions-generate-runner-jitconfig-for-repo';
import { ActionsGenerateRunnerJitconfigForRepo$Params } from '../fn/actions/actions-generate-runner-jitconfig-for-repo';
import { actionsGetActionsCacheList } from '../fn/actions/actions-get-actions-cache-list';
import { ActionsGetActionsCacheList$Params } from '../fn/actions/actions-get-actions-cache-list';
import { actionsGetActionsCacheUsage } from '../fn/actions/actions-get-actions-cache-usage';
import { ActionsGetActionsCacheUsage$Params } from '../fn/actions/actions-get-actions-cache-usage';
import { actionsGetActionsCacheUsageByRepoForOrg } from '../fn/actions/actions-get-actions-cache-usage-by-repo-for-org';
import { ActionsGetActionsCacheUsageByRepoForOrg$Params } from '../fn/actions/actions-get-actions-cache-usage-by-repo-for-org';
import { actionsGetActionsCacheUsageForOrg } from '../fn/actions/actions-get-actions-cache-usage-for-org';
import { ActionsGetActionsCacheUsageForOrg$Params } from '../fn/actions/actions-get-actions-cache-usage-for-org';
import { actionsGetAllowedActionsOrganization } from '../fn/actions/actions-get-allowed-actions-organization';
import { ActionsGetAllowedActionsOrganization$Params } from '../fn/actions/actions-get-allowed-actions-organization';
import { actionsGetAllowedActionsRepository } from '../fn/actions/actions-get-allowed-actions-repository';
import { ActionsGetAllowedActionsRepository$Params } from '../fn/actions/actions-get-allowed-actions-repository';
import { actionsGetArtifact } from '../fn/actions/actions-get-artifact';
import { ActionsGetArtifact$Params } from '../fn/actions/actions-get-artifact';
import { actionsGetCustomOidcSubClaimForRepo } from '../fn/actions/actions-get-custom-oidc-sub-claim-for-repo';
import { ActionsGetCustomOidcSubClaimForRepo$Params } from '../fn/actions/actions-get-custom-oidc-sub-claim-for-repo';
import { actionsGetEnvironmentPublicKey } from '../fn/actions/actions-get-environment-public-key';
import { ActionsGetEnvironmentPublicKey$Params } from '../fn/actions/actions-get-environment-public-key';
import { actionsGetEnvironmentSecret } from '../fn/actions/actions-get-environment-secret';
import { ActionsGetEnvironmentSecret$Params } from '../fn/actions/actions-get-environment-secret';
import { actionsGetEnvironmentVariable } from '../fn/actions/actions-get-environment-variable';
import { ActionsGetEnvironmentVariable$Params } from '../fn/actions/actions-get-environment-variable';
import { actionsGetGithubActionsDefaultWorkflowPermissionsOrganization } from '../fn/actions/actions-get-github-actions-default-workflow-permissions-organization';
import { ActionsGetGithubActionsDefaultWorkflowPermissionsOrganization$Params } from '../fn/actions/actions-get-github-actions-default-workflow-permissions-organization';
import { actionsGetGithubActionsDefaultWorkflowPermissionsRepository } from '../fn/actions/actions-get-github-actions-default-workflow-permissions-repository';
import { ActionsGetGithubActionsDefaultWorkflowPermissionsRepository$Params } from '../fn/actions/actions-get-github-actions-default-workflow-permissions-repository';
import { actionsGetGithubActionsPermissionsOrganization } from '../fn/actions/actions-get-github-actions-permissions-organization';
import { ActionsGetGithubActionsPermissionsOrganization$Params } from '../fn/actions/actions-get-github-actions-permissions-organization';
import { actionsGetGithubActionsPermissionsRepository } from '../fn/actions/actions-get-github-actions-permissions-repository';
import { ActionsGetGithubActionsPermissionsRepository$Params } from '../fn/actions/actions-get-github-actions-permissions-repository';
import { actionsGetJobForWorkflowRun } from '../fn/actions/actions-get-job-for-workflow-run';
import { ActionsGetJobForWorkflowRun$Params } from '../fn/actions/actions-get-job-for-workflow-run';
import { actionsGetOrgPublicKey } from '../fn/actions/actions-get-org-public-key';
import { ActionsGetOrgPublicKey$Params } from '../fn/actions/actions-get-org-public-key';
import { actionsGetOrgSecret } from '../fn/actions/actions-get-org-secret';
import { ActionsGetOrgSecret$Params } from '../fn/actions/actions-get-org-secret';
import { actionsGetOrgVariable } from '../fn/actions/actions-get-org-variable';
import { ActionsGetOrgVariable$Params } from '../fn/actions/actions-get-org-variable';
import { actionsGetPendingDeploymentsForRun } from '../fn/actions/actions-get-pending-deployments-for-run';
import { ActionsGetPendingDeploymentsForRun$Params } from '../fn/actions/actions-get-pending-deployments-for-run';
import { actionsGetRepoPublicKey } from '../fn/actions/actions-get-repo-public-key';
import { ActionsGetRepoPublicKey$Params } from '../fn/actions/actions-get-repo-public-key';
import { actionsGetRepoSecret } from '../fn/actions/actions-get-repo-secret';
import { ActionsGetRepoSecret$Params } from '../fn/actions/actions-get-repo-secret';
import { actionsGetRepoVariable } from '../fn/actions/actions-get-repo-variable';
import { ActionsGetRepoVariable$Params } from '../fn/actions/actions-get-repo-variable';
import { actionsGetReviewsForRun } from '../fn/actions/actions-get-reviews-for-run';
import { ActionsGetReviewsForRun$Params } from '../fn/actions/actions-get-reviews-for-run';
import { actionsGetSelfHostedRunnerForOrg } from '../fn/actions/actions-get-self-hosted-runner-for-org';
import { ActionsGetSelfHostedRunnerForOrg$Params } from '../fn/actions/actions-get-self-hosted-runner-for-org';
import { actionsGetSelfHostedRunnerForRepo } from '../fn/actions/actions-get-self-hosted-runner-for-repo';
import { ActionsGetSelfHostedRunnerForRepo$Params } from '../fn/actions/actions-get-self-hosted-runner-for-repo';
import { actionsGetWorkflow } from '../fn/actions/actions-get-workflow';
import { ActionsGetWorkflow$Params } from '../fn/actions/actions-get-workflow';
import { actionsGetWorkflowAccessToRepository } from '../fn/actions/actions-get-workflow-access-to-repository';
import { ActionsGetWorkflowAccessToRepository$Params } from '../fn/actions/actions-get-workflow-access-to-repository';
import { actionsGetWorkflowRun } from '../fn/actions/actions-get-workflow-run';
import { ActionsGetWorkflowRun$Params } from '../fn/actions/actions-get-workflow-run';
import { actionsGetWorkflowRunAttempt } from '../fn/actions/actions-get-workflow-run-attempt';
import { ActionsGetWorkflowRunAttempt$Params } from '../fn/actions/actions-get-workflow-run-attempt';
import { actionsGetWorkflowRunUsage } from '../fn/actions/actions-get-workflow-run-usage';
import { ActionsGetWorkflowRunUsage$Params } from '../fn/actions/actions-get-workflow-run-usage';
import { actionsGetWorkflowUsage } from '../fn/actions/actions-get-workflow-usage';
import { ActionsGetWorkflowUsage$Params } from '../fn/actions/actions-get-workflow-usage';
import { actionsListArtifactsForRepo } from '../fn/actions/actions-list-artifacts-for-repo';
import { ActionsListArtifactsForRepo$Params } from '../fn/actions/actions-list-artifacts-for-repo';
import { actionsListEnvironmentSecrets } from '../fn/actions/actions-list-environment-secrets';
import { ActionsListEnvironmentSecrets$Params } from '../fn/actions/actions-list-environment-secrets';
import { actionsListEnvironmentVariables } from '../fn/actions/actions-list-environment-variables';
import { ActionsListEnvironmentVariables$Params } from '../fn/actions/actions-list-environment-variables';
import { actionsListJobsForWorkflowRun } from '../fn/actions/actions-list-jobs-for-workflow-run';
import { ActionsListJobsForWorkflowRun$Params } from '../fn/actions/actions-list-jobs-for-workflow-run';
import { actionsListJobsForWorkflowRunAttempt } from '../fn/actions/actions-list-jobs-for-workflow-run-attempt';
import { ActionsListJobsForWorkflowRunAttempt$Params } from '../fn/actions/actions-list-jobs-for-workflow-run-attempt';
import { actionsListLabelsForSelfHostedRunnerForOrg } from '../fn/actions/actions-list-labels-for-self-hosted-runner-for-org';
import { ActionsListLabelsForSelfHostedRunnerForOrg$Params } from '../fn/actions/actions-list-labels-for-self-hosted-runner-for-org';
import { actionsListLabelsForSelfHostedRunnerForRepo } from '../fn/actions/actions-list-labels-for-self-hosted-runner-for-repo';
import { ActionsListLabelsForSelfHostedRunnerForRepo$Params } from '../fn/actions/actions-list-labels-for-self-hosted-runner-for-repo';
import { actionsListOrgSecrets } from '../fn/actions/actions-list-org-secrets';
import { ActionsListOrgSecrets$Params } from '../fn/actions/actions-list-org-secrets';
import { actionsListOrgVariables } from '../fn/actions/actions-list-org-variables';
import { ActionsListOrgVariables$Params } from '../fn/actions/actions-list-org-variables';
import { actionsListRepoOrganizationSecrets } from '../fn/actions/actions-list-repo-organization-secrets';
import { ActionsListRepoOrganizationSecrets$Params } from '../fn/actions/actions-list-repo-organization-secrets';
import { actionsListRepoOrganizationVariables } from '../fn/actions/actions-list-repo-organization-variables';
import { ActionsListRepoOrganizationVariables$Params } from '../fn/actions/actions-list-repo-organization-variables';
import { actionsListRepoSecrets } from '../fn/actions/actions-list-repo-secrets';
import { ActionsListRepoSecrets$Params } from '../fn/actions/actions-list-repo-secrets';
import { actionsListRepoVariables } from '../fn/actions/actions-list-repo-variables';
import { ActionsListRepoVariables$Params } from '../fn/actions/actions-list-repo-variables';
import { actionsListRepoWorkflows } from '../fn/actions/actions-list-repo-workflows';
import { ActionsListRepoWorkflows$Params } from '../fn/actions/actions-list-repo-workflows';
import { actionsListRunnerApplicationsForOrg } from '../fn/actions/actions-list-runner-applications-for-org';
import { ActionsListRunnerApplicationsForOrg$Params } from '../fn/actions/actions-list-runner-applications-for-org';
import { actionsListRunnerApplicationsForRepo } from '../fn/actions/actions-list-runner-applications-for-repo';
import { ActionsListRunnerApplicationsForRepo$Params } from '../fn/actions/actions-list-runner-applications-for-repo';
import { actionsListSelectedReposForOrgSecret } from '../fn/actions/actions-list-selected-repos-for-org-secret';
import { ActionsListSelectedReposForOrgSecret$Params } from '../fn/actions/actions-list-selected-repos-for-org-secret';
import { actionsListSelectedReposForOrgVariable } from '../fn/actions/actions-list-selected-repos-for-org-variable';
import { ActionsListSelectedReposForOrgVariable$Params } from '../fn/actions/actions-list-selected-repos-for-org-variable';
import { actionsListSelectedRepositoriesEnabledGithubActionsOrganization } from '../fn/actions/actions-list-selected-repositories-enabled-github-actions-organization';
import { ActionsListSelectedRepositoriesEnabledGithubActionsOrganization$Params } from '../fn/actions/actions-list-selected-repositories-enabled-github-actions-organization';
import { actionsListSelfHostedRunnersForOrg } from '../fn/actions/actions-list-self-hosted-runners-for-org';
import { ActionsListSelfHostedRunnersForOrg$Params } from '../fn/actions/actions-list-self-hosted-runners-for-org';
import { actionsListSelfHostedRunnersForRepo } from '../fn/actions/actions-list-self-hosted-runners-for-repo';
import { ActionsListSelfHostedRunnersForRepo$Params } from '../fn/actions/actions-list-self-hosted-runners-for-repo';
import { actionsListWorkflowRunArtifacts } from '../fn/actions/actions-list-workflow-run-artifacts';
import { ActionsListWorkflowRunArtifacts$Params } from '../fn/actions/actions-list-workflow-run-artifacts';
import { actionsListWorkflowRuns } from '../fn/actions/actions-list-workflow-runs';
import { ActionsListWorkflowRuns$Params } from '../fn/actions/actions-list-workflow-runs';
import { actionsListWorkflowRunsForRepo } from '../fn/actions/actions-list-workflow-runs-for-repo';
import { ActionsListWorkflowRunsForRepo$Params } from '../fn/actions/actions-list-workflow-runs-for-repo';
import { actionsRemoveAllCustomLabelsFromSelfHostedRunnerForOrg } from '../fn/actions/actions-remove-all-custom-labels-from-self-hosted-runner-for-org';
import { ActionsRemoveAllCustomLabelsFromSelfHostedRunnerForOrg$Params } from '../fn/actions/actions-remove-all-custom-labels-from-self-hosted-runner-for-org';
import { actionsRemoveAllCustomLabelsFromSelfHostedRunnerForRepo } from '../fn/actions/actions-remove-all-custom-labels-from-self-hosted-runner-for-repo';
import { ActionsRemoveAllCustomLabelsFromSelfHostedRunnerForRepo$Params } from '../fn/actions/actions-remove-all-custom-labels-from-self-hosted-runner-for-repo';
import { actionsRemoveCustomLabelFromSelfHostedRunnerForOrg } from '../fn/actions/actions-remove-custom-label-from-self-hosted-runner-for-org';
import { ActionsRemoveCustomLabelFromSelfHostedRunnerForOrg$Params } from '../fn/actions/actions-remove-custom-label-from-self-hosted-runner-for-org';
import { actionsRemoveCustomLabelFromSelfHostedRunnerForRepo } from '../fn/actions/actions-remove-custom-label-from-self-hosted-runner-for-repo';
import { ActionsRemoveCustomLabelFromSelfHostedRunnerForRepo$Params } from '../fn/actions/actions-remove-custom-label-from-self-hosted-runner-for-repo';
import { actionsRemoveSelectedRepoFromOrgSecret } from '../fn/actions/actions-remove-selected-repo-from-org-secret';
import { ActionsRemoveSelectedRepoFromOrgSecret$Params } from '../fn/actions/actions-remove-selected-repo-from-org-secret';
import { actionsRemoveSelectedRepoFromOrgVariable } from '../fn/actions/actions-remove-selected-repo-from-org-variable';
import { ActionsRemoveSelectedRepoFromOrgVariable$Params } from '../fn/actions/actions-remove-selected-repo-from-org-variable';
import { actionsReRunJobForWorkflowRun } from '../fn/actions/actions-re-run-job-for-workflow-run';
import { ActionsReRunJobForWorkflowRun$Params } from '../fn/actions/actions-re-run-job-for-workflow-run';
import { actionsReRunWorkflow } from '../fn/actions/actions-re-run-workflow';
import { ActionsReRunWorkflow$Params } from '../fn/actions/actions-re-run-workflow';
import { actionsReRunWorkflowFailedJobs } from '../fn/actions/actions-re-run-workflow-failed-jobs';
import { ActionsReRunWorkflowFailedJobs$Params } from '../fn/actions/actions-re-run-workflow-failed-jobs';
import { actionsReviewCustomGatesForRun } from '../fn/actions/actions-review-custom-gates-for-run';
import { ActionsReviewCustomGatesForRun$Params } from '../fn/actions/actions-review-custom-gates-for-run';
import { actionsReviewPendingDeploymentsForRun } from '../fn/actions/actions-review-pending-deployments-for-run';
import { ActionsReviewPendingDeploymentsForRun$Params } from '../fn/actions/actions-review-pending-deployments-for-run';
import { actionsSetAllowedActionsOrganization } from '../fn/actions/actions-set-allowed-actions-organization';
import { ActionsSetAllowedActionsOrganization$Params } from '../fn/actions/actions-set-allowed-actions-organization';
import { actionsSetAllowedActionsRepository } from '../fn/actions/actions-set-allowed-actions-repository';
import { ActionsSetAllowedActionsRepository$Params } from '../fn/actions/actions-set-allowed-actions-repository';
import { actionsSetCustomLabelsForSelfHostedRunnerForOrg } from '../fn/actions/actions-set-custom-labels-for-self-hosted-runner-for-org';
import { ActionsSetCustomLabelsForSelfHostedRunnerForOrg$Params } from '../fn/actions/actions-set-custom-labels-for-self-hosted-runner-for-org';
import { actionsSetCustomLabelsForSelfHostedRunnerForRepo } from '../fn/actions/actions-set-custom-labels-for-self-hosted-runner-for-repo';
import { ActionsSetCustomLabelsForSelfHostedRunnerForRepo$Params } from '../fn/actions/actions-set-custom-labels-for-self-hosted-runner-for-repo';
import { actionsSetCustomOidcSubClaimForRepo } from '../fn/actions/actions-set-custom-oidc-sub-claim-for-repo';
import { ActionsSetCustomOidcSubClaimForRepo$Params } from '../fn/actions/actions-set-custom-oidc-sub-claim-for-repo';
import { actionsSetGithubActionsDefaultWorkflowPermissionsOrganization } from '../fn/actions/actions-set-github-actions-default-workflow-permissions-organization';
import { ActionsSetGithubActionsDefaultWorkflowPermissionsOrganization$Params } from '../fn/actions/actions-set-github-actions-default-workflow-permissions-organization';
import { actionsSetGithubActionsDefaultWorkflowPermissionsRepository } from '../fn/actions/actions-set-github-actions-default-workflow-permissions-repository';
import { ActionsSetGithubActionsDefaultWorkflowPermissionsRepository$Params } from '../fn/actions/actions-set-github-actions-default-workflow-permissions-repository';
import { actionsSetGithubActionsPermissionsOrganization } from '../fn/actions/actions-set-github-actions-permissions-organization';
import { ActionsSetGithubActionsPermissionsOrganization$Params } from '../fn/actions/actions-set-github-actions-permissions-organization';
import { actionsSetGithubActionsPermissionsRepository } from '../fn/actions/actions-set-github-actions-permissions-repository';
import { ActionsSetGithubActionsPermissionsRepository$Params } from '../fn/actions/actions-set-github-actions-permissions-repository';
import { actionsSetSelectedReposForOrgSecret } from '../fn/actions/actions-set-selected-repos-for-org-secret';
import { ActionsSetSelectedReposForOrgSecret$Params } from '../fn/actions/actions-set-selected-repos-for-org-secret';
import { actionsSetSelectedReposForOrgVariable } from '../fn/actions/actions-set-selected-repos-for-org-variable';
import { ActionsSetSelectedReposForOrgVariable$Params } from '../fn/actions/actions-set-selected-repos-for-org-variable';
import { actionsSetSelectedRepositoriesEnabledGithubActionsOrganization } from '../fn/actions/actions-set-selected-repositories-enabled-github-actions-organization';
import { ActionsSetSelectedRepositoriesEnabledGithubActionsOrganization$Params } from '../fn/actions/actions-set-selected-repositories-enabled-github-actions-organization';
import { actionsSetWorkflowAccessToRepository } from '../fn/actions/actions-set-workflow-access-to-repository';
import { ActionsSetWorkflowAccessToRepository$Params } from '../fn/actions/actions-set-workflow-access-to-repository';
import { actionsUpdateEnvironmentVariable } from '../fn/actions/actions-update-environment-variable';
import { ActionsUpdateEnvironmentVariable$Params } from '../fn/actions/actions-update-environment-variable';
import { actionsUpdateOrgVariable } from '../fn/actions/actions-update-org-variable';
import { ActionsUpdateOrgVariable$Params } from '../fn/actions/actions-update-org-variable';
import { actionsUpdateRepoVariable } from '../fn/actions/actions-update-repo-variable';
import { ActionsUpdateRepoVariable$Params } from '../fn/actions/actions-update-repo-variable';
import { Artifact } from '../models/artifact';
import { AuthenticationToken } from '../models/authentication-token';
import { Deployment } from '../models/deployment';
import { EmptyObject } from '../models/empty-object';
import { EnvironmentApprovals } from '../models/environment-approvals';
import { Job } from '../models/job';
import { MinimalRepository } from '../models/minimal-repository';
import { OidcCustomSubRepo } from '../models/oidc-custom-sub-repo';
import { OrganizationActionsSecret } from '../models/organization-actions-secret';
import { OrganizationActionsVariable } from '../models/organization-actions-variable';
import { PendingDeployment } from '../models/pending-deployment';
import { Repository } from '../models/repository';
import { Runner } from '../models/runner';
import { RunnerApplication } from '../models/runner-application';
import { RunnerLabel } from '../models/runner-label';
import { SelectedActions } from '../models/selected-actions';
import { Workflow } from '../models/workflow';
import { WorkflowRun } from '../models/workflow-run';
import { WorkflowRunUsage } from '../models/workflow-run-usage';
import { WorkflowUsage } from '../models/workflow-usage';


/**
 * Endpoints to manage GitHub Actions using the REST API.
 */
@Injectable({ providedIn: 'root' })
export class ActionsService extends BaseService {
  constructor(config: ApiConfiguration, http: HttpClient) {
    super(config, http);
  }

  /** Path part for operation `actionsGetActionsCacheUsageForOrg()` */
  static readonly ActionsGetActionsCacheUsageForOrgPath = '/orgs/{org}/actions/cache/usage';

  /**
   * Get GitHub Actions cache usage for an organization.
   *
   * Gets the total GitHub Actions cache usage for an organization.
   * The data fetched using this API is refreshed approximately every 5 minutes, so values returned from this endpoint may take at least 5 minutes to get updated.
   * You must authenticate using an access token with the `read:org` scope to use this endpoint. GitHub Apps must have the `organization_admistration:read` permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsGetActionsCacheUsageForOrg()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsGetActionsCacheUsageForOrg$Response(params: ActionsGetActionsCacheUsageForOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<ActionsCacheUsageOrgEnterprise>> {
    return actionsGetActionsCacheUsageForOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * Get GitHub Actions cache usage for an organization.
   *
   * Gets the total GitHub Actions cache usage for an organization.
   * The data fetched using this API is refreshed approximately every 5 minutes, so values returned from this endpoint may take at least 5 minutes to get updated.
   * You must authenticate using an access token with the `read:org` scope to use this endpoint. GitHub Apps must have the `organization_admistration:read` permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsGetActionsCacheUsageForOrg$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsGetActionsCacheUsageForOrg(params: ActionsGetActionsCacheUsageForOrg$Params, context?: HttpContext): Observable<ActionsCacheUsageOrgEnterprise> {
    return this.actionsGetActionsCacheUsageForOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<ActionsCacheUsageOrgEnterprise>): ActionsCacheUsageOrgEnterprise => r.body)
    );
  }

  /** Path part for operation `actionsGetActionsCacheUsageByRepoForOrg()` */
  static readonly ActionsGetActionsCacheUsageByRepoForOrgPath = '/orgs/{org}/actions/cache/usage-by-repository';

  /**
   * List repositories with GitHub Actions cache usage for an organization.
   *
   * Lists repositories and their GitHub Actions cache usage for an organization.
   * The data fetched using this API is refreshed approximately every 5 minutes, so values returned from this endpoint may take at least 5 minutes to get updated.
   * You must authenticate using an access token with the `read:org` scope to use this endpoint. GitHub Apps must have the `organization_admistration:read` permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsGetActionsCacheUsageByRepoForOrg()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsGetActionsCacheUsageByRepoForOrg$Response(params: ActionsGetActionsCacheUsageByRepoForOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'repository_cache_usages': Array<ActionsCacheUsageByRepository>;
}>> {
    return actionsGetActionsCacheUsageByRepoForOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * List repositories with GitHub Actions cache usage for an organization.
   *
   * Lists repositories and their GitHub Actions cache usage for an organization.
   * The data fetched using this API is refreshed approximately every 5 minutes, so values returned from this endpoint may take at least 5 minutes to get updated.
   * You must authenticate using an access token with the `read:org` scope to use this endpoint. GitHub Apps must have the `organization_admistration:read` permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsGetActionsCacheUsageByRepoForOrg$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsGetActionsCacheUsageByRepoForOrg(params: ActionsGetActionsCacheUsageByRepoForOrg$Params, context?: HttpContext): Observable<{
'total_count': number;
'repository_cache_usages': Array<ActionsCacheUsageByRepository>;
}> {
    return this.actionsGetActionsCacheUsageByRepoForOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'total_count': number;
'repository_cache_usages': Array<ActionsCacheUsageByRepository>;
}>): {
'total_count': number;
'repository_cache_usages': Array<ActionsCacheUsageByRepository>;
} => r.body)
    );
  }

  /** Path part for operation `actionsGetGithubActionsPermissionsOrganization()` */
  static readonly ActionsGetGithubActionsPermissionsOrganizationPath = '/orgs/{org}/actions/permissions';

  /**
   * Get GitHub Actions permissions for an organization.
   *
   * Gets the GitHub Actions permissions policy for repositories and allowed actions and reusable workflows in an organization.
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint. GitHub Apps must have the `administration` organization permission to use this API.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsGetGithubActionsPermissionsOrganization()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsGetGithubActionsPermissionsOrganization$Response(params: ActionsGetGithubActionsPermissionsOrganization$Params, context?: HttpContext): Observable<StrictHttpResponse<ActionsOrganizationPermissions>> {
    return actionsGetGithubActionsPermissionsOrganization(this.http, this.rootUrl, params, context);
  }

  /**
   * Get GitHub Actions permissions for an organization.
   *
   * Gets the GitHub Actions permissions policy for repositories and allowed actions and reusable workflows in an organization.
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint. GitHub Apps must have the `administration` organization permission to use this API.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsGetGithubActionsPermissionsOrganization$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsGetGithubActionsPermissionsOrganization(params: ActionsGetGithubActionsPermissionsOrganization$Params, context?: HttpContext): Observable<ActionsOrganizationPermissions> {
    return this.actionsGetGithubActionsPermissionsOrganization$Response(params, context).pipe(
      map((r: StrictHttpResponse<ActionsOrganizationPermissions>): ActionsOrganizationPermissions => r.body)
    );
  }

  /** Path part for operation `actionsSetGithubActionsPermissionsOrganization()` */
  static readonly ActionsSetGithubActionsPermissionsOrganizationPath = '/orgs/{org}/actions/permissions';

  /**
   * Set GitHub Actions permissions for an organization.
   *
   * Sets the GitHub Actions permissions policy for repositories and allowed actions and reusable workflows in an organization.
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint. GitHub Apps must have the `administration` organization permission to use this API.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsSetGithubActionsPermissionsOrganization()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  actionsSetGithubActionsPermissionsOrganization$Response(params: ActionsSetGithubActionsPermissionsOrganization$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return actionsSetGithubActionsPermissionsOrganization(this.http, this.rootUrl, params, context);
  }

  /**
   * Set GitHub Actions permissions for an organization.
   *
   * Sets the GitHub Actions permissions policy for repositories and allowed actions and reusable workflows in an organization.
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint. GitHub Apps must have the `administration` organization permission to use this API.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsSetGithubActionsPermissionsOrganization$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  actionsSetGithubActionsPermissionsOrganization(params: ActionsSetGithubActionsPermissionsOrganization$Params, context?: HttpContext): Observable<void> {
    return this.actionsSetGithubActionsPermissionsOrganization$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `actionsListSelectedRepositoriesEnabledGithubActionsOrganization()` */
  static readonly ActionsListSelectedRepositoriesEnabledGithubActionsOrganizationPath = '/orgs/{org}/actions/permissions/repositories';

  /**
   * List selected repositories enabled for GitHub Actions in an organization.
   *
   * Lists the selected repositories that are enabled for GitHub Actions in an organization. To use this endpoint, the organization permission policy for `enabled_repositories` must be configured to `selected`. For more information, see "[Set GitHub Actions permissions for an organization](#set-github-actions-permissions-for-an-organization)."
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint. GitHub Apps must have the `administration` organization permission to use this API.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsListSelectedRepositoriesEnabledGithubActionsOrganization()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsListSelectedRepositoriesEnabledGithubActionsOrganization$Response(params: ActionsListSelectedRepositoriesEnabledGithubActionsOrganization$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'repositories': Array<Repository>;
}>> {
    return actionsListSelectedRepositoriesEnabledGithubActionsOrganization(this.http, this.rootUrl, params, context);
  }

  /**
   * List selected repositories enabled for GitHub Actions in an organization.
   *
   * Lists the selected repositories that are enabled for GitHub Actions in an organization. To use this endpoint, the organization permission policy for `enabled_repositories` must be configured to `selected`. For more information, see "[Set GitHub Actions permissions for an organization](#set-github-actions-permissions-for-an-organization)."
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint. GitHub Apps must have the `administration` organization permission to use this API.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsListSelectedRepositoriesEnabledGithubActionsOrganization$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsListSelectedRepositoriesEnabledGithubActionsOrganization(params: ActionsListSelectedRepositoriesEnabledGithubActionsOrganization$Params, context?: HttpContext): Observable<{
'total_count': number;
'repositories': Array<Repository>;
}> {
    return this.actionsListSelectedRepositoriesEnabledGithubActionsOrganization$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'total_count': number;
'repositories': Array<Repository>;
}>): {
'total_count': number;
'repositories': Array<Repository>;
} => r.body)
    );
  }

  /** Path part for operation `actionsSetSelectedRepositoriesEnabledGithubActionsOrganization()` */
  static readonly ActionsSetSelectedRepositoriesEnabledGithubActionsOrganizationPath = '/orgs/{org}/actions/permissions/repositories';

  /**
   * Set selected repositories enabled for GitHub Actions in an organization.
   *
   * Replaces the list of selected repositories that are enabled for GitHub Actions in an organization. To use this endpoint, the organization permission policy for `enabled_repositories` must be configured to `selected`. For more information, see "[Set GitHub Actions permissions for an organization](#set-github-actions-permissions-for-an-organization)."
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint. GitHub Apps must have the `administration` organization permission to use this API.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsSetSelectedRepositoriesEnabledGithubActionsOrganization()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  actionsSetSelectedRepositoriesEnabledGithubActionsOrganization$Response(params: ActionsSetSelectedRepositoriesEnabledGithubActionsOrganization$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return actionsSetSelectedRepositoriesEnabledGithubActionsOrganization(this.http, this.rootUrl, params, context);
  }

  /**
   * Set selected repositories enabled for GitHub Actions in an organization.
   *
   * Replaces the list of selected repositories that are enabled for GitHub Actions in an organization. To use this endpoint, the organization permission policy for `enabled_repositories` must be configured to `selected`. For more information, see "[Set GitHub Actions permissions for an organization](#set-github-actions-permissions-for-an-organization)."
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint. GitHub Apps must have the `administration` organization permission to use this API.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsSetSelectedRepositoriesEnabledGithubActionsOrganization$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  actionsSetSelectedRepositoriesEnabledGithubActionsOrganization(params: ActionsSetSelectedRepositoriesEnabledGithubActionsOrganization$Params, context?: HttpContext): Observable<void> {
    return this.actionsSetSelectedRepositoriesEnabledGithubActionsOrganization$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `actionsEnableSelectedRepositoryGithubActionsOrganization()` */
  static readonly ActionsEnableSelectedRepositoryGithubActionsOrganizationPath = '/orgs/{org}/actions/permissions/repositories/{repository_id}';

  /**
   * Enable a selected repository for GitHub Actions in an organization.
   *
   * Adds a repository to the list of selected repositories that are enabled for GitHub Actions in an organization. To use this endpoint, the organization permission policy for `enabled_repositories` must be must be configured to `selected`. For more information, see "[Set GitHub Actions permissions for an organization](#set-github-actions-permissions-for-an-organization)."
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint. GitHub Apps must have the `administration` organization permission to use this API.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsEnableSelectedRepositoryGithubActionsOrganization()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsEnableSelectedRepositoryGithubActionsOrganization$Response(params: ActionsEnableSelectedRepositoryGithubActionsOrganization$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return actionsEnableSelectedRepositoryGithubActionsOrganization(this.http, this.rootUrl, params, context);
  }

  /**
   * Enable a selected repository for GitHub Actions in an organization.
   *
   * Adds a repository to the list of selected repositories that are enabled for GitHub Actions in an organization. To use this endpoint, the organization permission policy for `enabled_repositories` must be must be configured to `selected`. For more information, see "[Set GitHub Actions permissions for an organization](#set-github-actions-permissions-for-an-organization)."
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint. GitHub Apps must have the `administration` organization permission to use this API.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsEnableSelectedRepositoryGithubActionsOrganization$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsEnableSelectedRepositoryGithubActionsOrganization(params: ActionsEnableSelectedRepositoryGithubActionsOrganization$Params, context?: HttpContext): Observable<void> {
    return this.actionsEnableSelectedRepositoryGithubActionsOrganization$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `actionsDisableSelectedRepositoryGithubActionsOrganization()` */
  static readonly ActionsDisableSelectedRepositoryGithubActionsOrganizationPath = '/orgs/{org}/actions/permissions/repositories/{repository_id}';

  /**
   * Disable a selected repository for GitHub Actions in an organization.
   *
   * Removes a repository from the list of selected repositories that are enabled for GitHub Actions in an organization. To use this endpoint, the organization permission policy for `enabled_repositories` must be configured to `selected`. For more information, see "[Set GitHub Actions permissions for an organization](#set-github-actions-permissions-for-an-organization)."
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint. GitHub Apps must have the `administration` organization permission to use this API.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsDisableSelectedRepositoryGithubActionsOrganization()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsDisableSelectedRepositoryGithubActionsOrganization$Response(params: ActionsDisableSelectedRepositoryGithubActionsOrganization$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return actionsDisableSelectedRepositoryGithubActionsOrganization(this.http, this.rootUrl, params, context);
  }

  /**
   * Disable a selected repository for GitHub Actions in an organization.
   *
   * Removes a repository from the list of selected repositories that are enabled for GitHub Actions in an organization. To use this endpoint, the organization permission policy for `enabled_repositories` must be configured to `selected`. For more information, see "[Set GitHub Actions permissions for an organization](#set-github-actions-permissions-for-an-organization)."
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint. GitHub Apps must have the `administration` organization permission to use this API.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsDisableSelectedRepositoryGithubActionsOrganization$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsDisableSelectedRepositoryGithubActionsOrganization(params: ActionsDisableSelectedRepositoryGithubActionsOrganization$Params, context?: HttpContext): Observable<void> {
    return this.actionsDisableSelectedRepositoryGithubActionsOrganization$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `actionsGetAllowedActionsOrganization()` */
  static readonly ActionsGetAllowedActionsOrganizationPath = '/orgs/{org}/actions/permissions/selected-actions';

  /**
   * Get allowed actions and reusable workflows for an organization.
   *
   * Gets the selected actions and reusable workflows that are allowed in an organization. To use this endpoint, the organization permission policy for `allowed_actions` must be configured to `selected`. For more information, see "[Set GitHub Actions permissions for an organization](#set-github-actions-permissions-for-an-organization).""
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint. GitHub Apps must have the `administration` organization permission to use this API.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsGetAllowedActionsOrganization()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsGetAllowedActionsOrganization$Response(params: ActionsGetAllowedActionsOrganization$Params, context?: HttpContext): Observable<StrictHttpResponse<SelectedActions>> {
    return actionsGetAllowedActionsOrganization(this.http, this.rootUrl, params, context);
  }

  /**
   * Get allowed actions and reusable workflows for an organization.
   *
   * Gets the selected actions and reusable workflows that are allowed in an organization. To use this endpoint, the organization permission policy for `allowed_actions` must be configured to `selected`. For more information, see "[Set GitHub Actions permissions for an organization](#set-github-actions-permissions-for-an-organization).""
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint. GitHub Apps must have the `administration` organization permission to use this API.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsGetAllowedActionsOrganization$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsGetAllowedActionsOrganization(params: ActionsGetAllowedActionsOrganization$Params, context?: HttpContext): Observable<SelectedActions> {
    return this.actionsGetAllowedActionsOrganization$Response(params, context).pipe(
      map((r: StrictHttpResponse<SelectedActions>): SelectedActions => r.body)
    );
  }

  /** Path part for operation `actionsSetAllowedActionsOrganization()` */
  static readonly ActionsSetAllowedActionsOrganizationPath = '/orgs/{org}/actions/permissions/selected-actions';

  /**
   * Set allowed actions and reusable workflows for an organization.
   *
   * Sets the actions and reusable workflows that are allowed in an organization. To use this endpoint, the organization permission policy for `allowed_actions` must be configured to `selected`. For more information, see "[Set GitHub Actions permissions for an organization](#set-github-actions-permissions-for-an-organization)."
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint. GitHub Apps must have the `administration` organization permission to use this API.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsSetAllowedActionsOrganization()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  actionsSetAllowedActionsOrganization$Response(params: ActionsSetAllowedActionsOrganization$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return actionsSetAllowedActionsOrganization(this.http, this.rootUrl, params, context);
  }

  /**
   * Set allowed actions and reusable workflows for an organization.
   *
   * Sets the actions and reusable workflows that are allowed in an organization. To use this endpoint, the organization permission policy for `allowed_actions` must be configured to `selected`. For more information, see "[Set GitHub Actions permissions for an organization](#set-github-actions-permissions-for-an-organization)."
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint. GitHub Apps must have the `administration` organization permission to use this API.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsSetAllowedActionsOrganization$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  actionsSetAllowedActionsOrganization(params: ActionsSetAllowedActionsOrganization$Params, context?: HttpContext): Observable<void> {
    return this.actionsSetAllowedActionsOrganization$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `actionsGetGithubActionsDefaultWorkflowPermissionsOrganization()` */
  static readonly ActionsGetGithubActionsDefaultWorkflowPermissionsOrganizationPath = '/orgs/{org}/actions/permissions/workflow';

  /**
   * Get default workflow permissions for an organization.
   *
   * Gets the default workflow permissions granted to the `GITHUB_TOKEN` when running workflows in an organization,
   * as well as whether GitHub Actions can submit approving pull request reviews. For more information, see
   * "[Setting the permissions of the GITHUB_TOKEN for your organization](https://docs.github.com/organizations/managing-organization-settings/disabling-or-limiting-github-actions-for-your-organization#setting-the-permissions-of-the-github_token-for-your-organization)."
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint. GitHub Apps must have the `administration` organization permission to use this API.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsGetGithubActionsDefaultWorkflowPermissionsOrganization()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsGetGithubActionsDefaultWorkflowPermissionsOrganization$Response(params: ActionsGetGithubActionsDefaultWorkflowPermissionsOrganization$Params, context?: HttpContext): Observable<StrictHttpResponse<ActionsGetDefaultWorkflowPermissions>> {
    return actionsGetGithubActionsDefaultWorkflowPermissionsOrganization(this.http, this.rootUrl, params, context);
  }

  /**
   * Get default workflow permissions for an organization.
   *
   * Gets the default workflow permissions granted to the `GITHUB_TOKEN` when running workflows in an organization,
   * as well as whether GitHub Actions can submit approving pull request reviews. For more information, see
   * "[Setting the permissions of the GITHUB_TOKEN for your organization](https://docs.github.com/organizations/managing-organization-settings/disabling-or-limiting-github-actions-for-your-organization#setting-the-permissions-of-the-github_token-for-your-organization)."
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint. GitHub Apps must have the `administration` organization permission to use this API.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsGetGithubActionsDefaultWorkflowPermissionsOrganization$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsGetGithubActionsDefaultWorkflowPermissionsOrganization(params: ActionsGetGithubActionsDefaultWorkflowPermissionsOrganization$Params, context?: HttpContext): Observable<ActionsGetDefaultWorkflowPermissions> {
    return this.actionsGetGithubActionsDefaultWorkflowPermissionsOrganization$Response(params, context).pipe(
      map((r: StrictHttpResponse<ActionsGetDefaultWorkflowPermissions>): ActionsGetDefaultWorkflowPermissions => r.body)
    );
  }

  /** Path part for operation `actionsSetGithubActionsDefaultWorkflowPermissionsOrganization()` */
  static readonly ActionsSetGithubActionsDefaultWorkflowPermissionsOrganizationPath = '/orgs/{org}/actions/permissions/workflow';

  /**
   * Set default workflow permissions for an organization.
   *
   * Sets the default workflow permissions granted to the `GITHUB_TOKEN` when running workflows in an organization, and sets if GitHub Actions
   * can submit approving pull request reviews. For more information, see
   * "[Setting the permissions of the GITHUB_TOKEN for your organization](https://docs.github.com/organizations/managing-organization-settings/disabling-or-limiting-github-actions-for-your-organization#setting-the-permissions-of-the-github_token-for-your-organization)."
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint. GitHub Apps must have the `administration` organization permission to use this API.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsSetGithubActionsDefaultWorkflowPermissionsOrganization()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  actionsSetGithubActionsDefaultWorkflowPermissionsOrganization$Response(params: ActionsSetGithubActionsDefaultWorkflowPermissionsOrganization$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return actionsSetGithubActionsDefaultWorkflowPermissionsOrganization(this.http, this.rootUrl, params, context);
  }

  /**
   * Set default workflow permissions for an organization.
   *
   * Sets the default workflow permissions granted to the `GITHUB_TOKEN` when running workflows in an organization, and sets if GitHub Actions
   * can submit approving pull request reviews. For more information, see
   * "[Setting the permissions of the GITHUB_TOKEN for your organization](https://docs.github.com/organizations/managing-organization-settings/disabling-or-limiting-github-actions-for-your-organization#setting-the-permissions-of-the-github_token-for-your-organization)."
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint. GitHub Apps must have the `administration` organization permission to use this API.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsSetGithubActionsDefaultWorkflowPermissionsOrganization$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  actionsSetGithubActionsDefaultWorkflowPermissionsOrganization(params: ActionsSetGithubActionsDefaultWorkflowPermissionsOrganization$Params, context?: HttpContext): Observable<void> {
    return this.actionsSetGithubActionsDefaultWorkflowPermissionsOrganization$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `actionsListSelfHostedRunnersForOrg()` */
  static readonly ActionsListSelfHostedRunnersForOrgPath = '/orgs/{org}/actions/runners';

  /**
   * List self-hosted runners for an organization.
   *
   * Lists all self-hosted runners configured in an organization.
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `administration` permission for repositories and the `organization_self_hosted_runners` permission for organizations.
   * Authenticated users must have admin access to repositories or organizations, or the `manage_runners:enterprise` scope for enterprises, to use these endpoints.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsListSelfHostedRunnersForOrg()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsListSelfHostedRunnersForOrg$Response(params: ActionsListSelfHostedRunnersForOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'runners': Array<Runner>;
}>> {
    return actionsListSelfHostedRunnersForOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * List self-hosted runners for an organization.
   *
   * Lists all self-hosted runners configured in an organization.
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `administration` permission for repositories and the `organization_self_hosted_runners` permission for organizations.
   * Authenticated users must have admin access to repositories or organizations, or the `manage_runners:enterprise` scope for enterprises, to use these endpoints.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsListSelfHostedRunnersForOrg$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsListSelfHostedRunnersForOrg(params: ActionsListSelfHostedRunnersForOrg$Params, context?: HttpContext): Observable<{
'total_count': number;
'runners': Array<Runner>;
}> {
    return this.actionsListSelfHostedRunnersForOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'total_count': number;
'runners': Array<Runner>;
}>): {
'total_count': number;
'runners': Array<Runner>;
} => r.body)
    );
  }

  /** Path part for operation `actionsListRunnerApplicationsForOrg()` */
  static readonly ActionsListRunnerApplicationsForOrgPath = '/orgs/{org}/actions/runners/downloads';

  /**
   * List runner applications for an organization.
   *
   * Lists binaries for the runner application that you can download and run.
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `administration` permission for repositories and the `organization_self_hosted_runners` permission for organizations.
   * Authenticated users must have admin access to repositories or organizations, or the `manage_runners:enterprise` scope for enterprises, to use these endpoints.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsListRunnerApplicationsForOrg()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsListRunnerApplicationsForOrg$Response(params: ActionsListRunnerApplicationsForOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<RunnerApplication>>> {
    return actionsListRunnerApplicationsForOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * List runner applications for an organization.
   *
   * Lists binaries for the runner application that you can download and run.
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `administration` permission for repositories and the `organization_self_hosted_runners` permission for organizations.
   * Authenticated users must have admin access to repositories or organizations, or the `manage_runners:enterprise` scope for enterprises, to use these endpoints.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsListRunnerApplicationsForOrg$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsListRunnerApplicationsForOrg(params: ActionsListRunnerApplicationsForOrg$Params, context?: HttpContext): Observable<Array<RunnerApplication>> {
    return this.actionsListRunnerApplicationsForOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<RunnerApplication>>): Array<RunnerApplication> => r.body)
    );
  }

  /** Path part for operation `actionsGenerateRunnerJitconfigForOrg()` */
  static readonly ActionsGenerateRunnerJitconfigForOrgPath = '/orgs/{org}/actions/runners/generate-jitconfig';

  /**
   * Create configuration for a just-in-time runner for an organization.
   *
   * Generates a configuration that can be passed to the runner application at startup.
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `administration` permission for repositories and the `organization_self_hosted_runners` permission for organizations.
   * Authenticated users must have admin access to repositories or organizations, or the `manage_runners:enterprise` scope for enterprises, to use these endpoints.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsGenerateRunnerJitconfigForOrg()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  actionsGenerateRunnerJitconfigForOrg$Response(params: ActionsGenerateRunnerJitconfigForOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'runner': Runner;

/**
 * The base64 encoded runner configuration.
 */
'encoded_jit_config': string;
}>> {
    return actionsGenerateRunnerJitconfigForOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * Create configuration for a just-in-time runner for an organization.
   *
   * Generates a configuration that can be passed to the runner application at startup.
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `administration` permission for repositories and the `organization_self_hosted_runners` permission for organizations.
   * Authenticated users must have admin access to repositories or organizations, or the `manage_runners:enterprise` scope for enterprises, to use these endpoints.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsGenerateRunnerJitconfigForOrg$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  actionsGenerateRunnerJitconfigForOrg(params: ActionsGenerateRunnerJitconfigForOrg$Params, context?: HttpContext): Observable<{
'runner': Runner;

/**
 * The base64 encoded runner configuration.
 */
'encoded_jit_config': string;
}> {
    return this.actionsGenerateRunnerJitconfigForOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'runner': Runner;

/**
 * The base64 encoded runner configuration.
 */
'encoded_jit_config': string;
}>): {
'runner': Runner;

/**
 * The base64 encoded runner configuration.
 */
'encoded_jit_config': string;
} => r.body)
    );
  }

  /** Path part for operation `actionsCreateRegistrationTokenForOrg()` */
  static readonly ActionsCreateRegistrationTokenForOrgPath = '/orgs/{org}/actions/runners/registration-token';

  /**
   * Create a registration token for an organization.
   *
   * Returns a token that you can pass to the `config` script. The token expires after one hour.
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `administration` permission for repositories and the `organization_self_hosted_runners` permission for organizations.
   * Authenticated users must have admin access to repositories or organizations, or the `manage_runners:enterprise` scope for enterprises, to use these endpoints.
   *
   * Example using registration token: 
   *
   * Configure your self-hosted runner, replacing `TOKEN` with the registration token provided by this endpoint.
   *
   * ```
   * ./config.sh --url https://github.com/octo-org --token TOKEN
   * ```
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsCreateRegistrationTokenForOrg()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsCreateRegistrationTokenForOrg$Response(params: ActionsCreateRegistrationTokenForOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<AuthenticationToken>> {
    return actionsCreateRegistrationTokenForOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * Create a registration token for an organization.
   *
   * Returns a token that you can pass to the `config` script. The token expires after one hour.
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `administration` permission for repositories and the `organization_self_hosted_runners` permission for organizations.
   * Authenticated users must have admin access to repositories or organizations, or the `manage_runners:enterprise` scope for enterprises, to use these endpoints.
   *
   * Example using registration token: 
   *
   * Configure your self-hosted runner, replacing `TOKEN` with the registration token provided by this endpoint.
   *
   * ```
   * ./config.sh --url https://github.com/octo-org --token TOKEN
   * ```
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsCreateRegistrationTokenForOrg$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsCreateRegistrationTokenForOrg(params: ActionsCreateRegistrationTokenForOrg$Params, context?: HttpContext): Observable<AuthenticationToken> {
    return this.actionsCreateRegistrationTokenForOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<AuthenticationToken>): AuthenticationToken => r.body)
    );
  }

  /** Path part for operation `actionsCreateRemoveTokenForOrg()` */
  static readonly ActionsCreateRemoveTokenForOrgPath = '/orgs/{org}/actions/runners/remove-token';

  /**
   * Create a remove token for an organization.
   *
   * Returns a token that you can pass to the `config` script to remove a self-hosted runner from an organization. The token expires after one hour.
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `administration` permission for repositories and the `organization_self_hosted_runners` permission for organizations.
   * Authenticated users must have admin access to repositories or organizations, or the `manage_runners:enterprise` scope for enterprises, to use these endpoints.
   *
   * Example using remove token:
   *
   * To remove your self-hosted runner from an organization, replace `TOKEN` with the remove token provided by this
   * endpoint.
   *
   * ```
   * ./config.sh remove --token TOKEN
   * ```
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsCreateRemoveTokenForOrg()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsCreateRemoveTokenForOrg$Response(params: ActionsCreateRemoveTokenForOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<AuthenticationToken>> {
    return actionsCreateRemoveTokenForOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * Create a remove token for an organization.
   *
   * Returns a token that you can pass to the `config` script to remove a self-hosted runner from an organization. The token expires after one hour.
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `administration` permission for repositories and the `organization_self_hosted_runners` permission for organizations.
   * Authenticated users must have admin access to repositories or organizations, or the `manage_runners:enterprise` scope for enterprises, to use these endpoints.
   *
   * Example using remove token:
   *
   * To remove your self-hosted runner from an organization, replace `TOKEN` with the remove token provided by this
   * endpoint.
   *
   * ```
   * ./config.sh remove --token TOKEN
   * ```
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsCreateRemoveTokenForOrg$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsCreateRemoveTokenForOrg(params: ActionsCreateRemoveTokenForOrg$Params, context?: HttpContext): Observable<AuthenticationToken> {
    return this.actionsCreateRemoveTokenForOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<AuthenticationToken>): AuthenticationToken => r.body)
    );
  }

  /** Path part for operation `actionsGetSelfHostedRunnerForOrg()` */
  static readonly ActionsGetSelfHostedRunnerForOrgPath = '/orgs/{org}/actions/runners/{runner_id}';

  /**
   * Get a self-hosted runner for an organization.
   *
   * Gets a specific self-hosted runner configured in an organization.
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `administration` permission for repositories and the `organization_self_hosted_runners` permission for organizations.
   * Authenticated users must have admin access to repositories or organizations, or the `manage_runners:enterprise` scope for enterprises, to use these endpoints.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsGetSelfHostedRunnerForOrg()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsGetSelfHostedRunnerForOrg$Response(params: ActionsGetSelfHostedRunnerForOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<Runner>> {
    return actionsGetSelfHostedRunnerForOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a self-hosted runner for an organization.
   *
   * Gets a specific self-hosted runner configured in an organization.
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `administration` permission for repositories and the `organization_self_hosted_runners` permission for organizations.
   * Authenticated users must have admin access to repositories or organizations, or the `manage_runners:enterprise` scope for enterprises, to use these endpoints.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsGetSelfHostedRunnerForOrg$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsGetSelfHostedRunnerForOrg(params: ActionsGetSelfHostedRunnerForOrg$Params, context?: HttpContext): Observable<Runner> {
    return this.actionsGetSelfHostedRunnerForOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<Runner>): Runner => r.body)
    );
  }

  /** Path part for operation `actionsDeleteSelfHostedRunnerFromOrg()` */
  static readonly ActionsDeleteSelfHostedRunnerFromOrgPath = '/orgs/{org}/actions/runners/{runner_id}';

  /**
   * Delete a self-hosted runner from an organization.
   *
   * Forces the removal of a self-hosted runner from an organization. You can use this endpoint to completely remove the runner when the machine you were using no longer exists.
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `administration` permission for repositories and the `organization_self_hosted_runners` permission for organizations.
   * Authenticated users must have admin access to repositories or organizations, or the `manage_runners:enterprise` scope for enterprises, to use these endpoints.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsDeleteSelfHostedRunnerFromOrg()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsDeleteSelfHostedRunnerFromOrg$Response(params: ActionsDeleteSelfHostedRunnerFromOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return actionsDeleteSelfHostedRunnerFromOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete a self-hosted runner from an organization.
   *
   * Forces the removal of a self-hosted runner from an organization. You can use this endpoint to completely remove the runner when the machine you were using no longer exists.
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `administration` permission for repositories and the `organization_self_hosted_runners` permission for organizations.
   * Authenticated users must have admin access to repositories or organizations, or the `manage_runners:enterprise` scope for enterprises, to use these endpoints.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsDeleteSelfHostedRunnerFromOrg$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsDeleteSelfHostedRunnerFromOrg(params: ActionsDeleteSelfHostedRunnerFromOrg$Params, context?: HttpContext): Observable<void> {
    return this.actionsDeleteSelfHostedRunnerFromOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `actionsListLabelsForSelfHostedRunnerForOrg()` */
  static readonly ActionsListLabelsForSelfHostedRunnerForOrgPath = '/orgs/{org}/actions/runners/{runner_id}/labels';

  /**
   * List labels for a self-hosted runner for an organization.
   *
   * Lists all labels for a self-hosted runner configured in an organization.
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `administration` permission for repositories and the `organization_self_hosted_runners` permission for organizations.
   * Authenticated users must have admin access to repositories or organizations, or the `manage_runners:enterprise` scope for enterprises, to use these endpoints.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsListLabelsForSelfHostedRunnerForOrg()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsListLabelsForSelfHostedRunnerForOrg$Response(params: ActionsListLabelsForSelfHostedRunnerForOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'labels': Array<RunnerLabel>;
}>> {
    return actionsListLabelsForSelfHostedRunnerForOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * List labels for a self-hosted runner for an organization.
   *
   * Lists all labels for a self-hosted runner configured in an organization.
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `administration` permission for repositories and the `organization_self_hosted_runners` permission for organizations.
   * Authenticated users must have admin access to repositories or organizations, or the `manage_runners:enterprise` scope for enterprises, to use these endpoints.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsListLabelsForSelfHostedRunnerForOrg$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsListLabelsForSelfHostedRunnerForOrg(params: ActionsListLabelsForSelfHostedRunnerForOrg$Params, context?: HttpContext): Observable<{
'total_count': number;
'labels': Array<RunnerLabel>;
}> {
    return this.actionsListLabelsForSelfHostedRunnerForOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'total_count': number;
'labels': Array<RunnerLabel>;
}>): {
'total_count': number;
'labels': Array<RunnerLabel>;
} => r.body)
    );
  }

  /** Path part for operation `actionsSetCustomLabelsForSelfHostedRunnerForOrg()` */
  static readonly ActionsSetCustomLabelsForSelfHostedRunnerForOrgPath = '/orgs/{org}/actions/runners/{runner_id}/labels';

  /**
   * Set custom labels for a self-hosted runner for an organization.
   *
   * Remove all previous custom labels and set the new custom labels for a specific
   * self-hosted runner configured in an organization.
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `administration` permission for repositories and the `organization_self_hosted_runners` permission for organizations.
   * Authenticated users must have admin access to repositories or organizations, or the `manage_runners:enterprise` scope for enterprises, to use these endpoints.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsSetCustomLabelsForSelfHostedRunnerForOrg()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  actionsSetCustomLabelsForSelfHostedRunnerForOrg$Response(params: ActionsSetCustomLabelsForSelfHostedRunnerForOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'labels': Array<RunnerLabel>;
}>> {
    return actionsSetCustomLabelsForSelfHostedRunnerForOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * Set custom labels for a self-hosted runner for an organization.
   *
   * Remove all previous custom labels and set the new custom labels for a specific
   * self-hosted runner configured in an organization.
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `administration` permission for repositories and the `organization_self_hosted_runners` permission for organizations.
   * Authenticated users must have admin access to repositories or organizations, or the `manage_runners:enterprise` scope for enterprises, to use these endpoints.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsSetCustomLabelsForSelfHostedRunnerForOrg$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  actionsSetCustomLabelsForSelfHostedRunnerForOrg(params: ActionsSetCustomLabelsForSelfHostedRunnerForOrg$Params, context?: HttpContext): Observable<{
'total_count': number;
'labels': Array<RunnerLabel>;
}> {
    return this.actionsSetCustomLabelsForSelfHostedRunnerForOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'total_count': number;
'labels': Array<RunnerLabel>;
}>): {
'total_count': number;
'labels': Array<RunnerLabel>;
} => r.body)
    );
  }

  /** Path part for operation `actionsAddCustomLabelsToSelfHostedRunnerForOrg()` */
  static readonly ActionsAddCustomLabelsToSelfHostedRunnerForOrgPath = '/orgs/{org}/actions/runners/{runner_id}/labels';

  /**
   * Add custom labels to a self-hosted runner for an organization.
   *
   * Add custom labels to a self-hosted runner configured in an organization.
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `administration` permission for repositories and the `organization_self_hosted_runners` permission for organizations.
   * Authenticated users must have admin access to repositories or organizations, or the `manage_runners:enterprise` scope for enterprises, to use these endpoints.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsAddCustomLabelsToSelfHostedRunnerForOrg()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  actionsAddCustomLabelsToSelfHostedRunnerForOrg$Response(params: ActionsAddCustomLabelsToSelfHostedRunnerForOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'labels': Array<RunnerLabel>;
}>> {
    return actionsAddCustomLabelsToSelfHostedRunnerForOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * Add custom labels to a self-hosted runner for an organization.
   *
   * Add custom labels to a self-hosted runner configured in an organization.
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `administration` permission for repositories and the `organization_self_hosted_runners` permission for organizations.
   * Authenticated users must have admin access to repositories or organizations, or the `manage_runners:enterprise` scope for enterprises, to use these endpoints.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsAddCustomLabelsToSelfHostedRunnerForOrg$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  actionsAddCustomLabelsToSelfHostedRunnerForOrg(params: ActionsAddCustomLabelsToSelfHostedRunnerForOrg$Params, context?: HttpContext): Observable<{
'total_count': number;
'labels': Array<RunnerLabel>;
}> {
    return this.actionsAddCustomLabelsToSelfHostedRunnerForOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'total_count': number;
'labels': Array<RunnerLabel>;
}>): {
'total_count': number;
'labels': Array<RunnerLabel>;
} => r.body)
    );
  }

  /** Path part for operation `actionsRemoveAllCustomLabelsFromSelfHostedRunnerForOrg()` */
  static readonly ActionsRemoveAllCustomLabelsFromSelfHostedRunnerForOrgPath = '/orgs/{org}/actions/runners/{runner_id}/labels';

  /**
   * Remove all custom labels from a self-hosted runner for an organization.
   *
   * Remove all custom labels from a self-hosted runner configured in an
   * organization. Returns the remaining read-only labels from the runner.
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `administration` permission for repositories and the `organization_self_hosted_runners` permission for organizations.
   * Authenticated users must have admin access to repositories or organizations, or the `manage_runners:enterprise` scope for enterprises, to use these endpoints.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsRemoveAllCustomLabelsFromSelfHostedRunnerForOrg()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsRemoveAllCustomLabelsFromSelfHostedRunnerForOrg$Response(params: ActionsRemoveAllCustomLabelsFromSelfHostedRunnerForOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'labels': Array<RunnerLabel>;
}>> {
    return actionsRemoveAllCustomLabelsFromSelfHostedRunnerForOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * Remove all custom labels from a self-hosted runner for an organization.
   *
   * Remove all custom labels from a self-hosted runner configured in an
   * organization. Returns the remaining read-only labels from the runner.
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `administration` permission for repositories and the `organization_self_hosted_runners` permission for organizations.
   * Authenticated users must have admin access to repositories or organizations, or the `manage_runners:enterprise` scope for enterprises, to use these endpoints.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsRemoveAllCustomLabelsFromSelfHostedRunnerForOrg$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsRemoveAllCustomLabelsFromSelfHostedRunnerForOrg(params: ActionsRemoveAllCustomLabelsFromSelfHostedRunnerForOrg$Params, context?: HttpContext): Observable<{
'total_count': number;
'labels': Array<RunnerLabel>;
}> {
    return this.actionsRemoveAllCustomLabelsFromSelfHostedRunnerForOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'total_count': number;
'labels': Array<RunnerLabel>;
}>): {
'total_count': number;
'labels': Array<RunnerLabel>;
} => r.body)
    );
  }

  /** Path part for operation `actionsRemoveCustomLabelFromSelfHostedRunnerForOrg()` */
  static readonly ActionsRemoveCustomLabelFromSelfHostedRunnerForOrgPath = '/orgs/{org}/actions/runners/{runner_id}/labels/{name}';

  /**
   * Remove a custom label from a self-hosted runner for an organization.
   *
   * Remove a custom label from a self-hosted runner configured
   * in an organization. Returns the remaining labels from the runner.
   *
   * This endpoint returns a `404 Not Found` status if the custom label is not
   * present on the runner.
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `administration` permission for repositories and the `organization_self_hosted_runners` permission for organizations.
   * Authenticated users must have admin access to repositories or organizations, or the `manage_runners:enterprise` scope for enterprises, to use these endpoints.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsRemoveCustomLabelFromSelfHostedRunnerForOrg()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsRemoveCustomLabelFromSelfHostedRunnerForOrg$Response(params: ActionsRemoveCustomLabelFromSelfHostedRunnerForOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'labels': Array<RunnerLabel>;
}>> {
    return actionsRemoveCustomLabelFromSelfHostedRunnerForOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * Remove a custom label from a self-hosted runner for an organization.
   *
   * Remove a custom label from a self-hosted runner configured
   * in an organization. Returns the remaining labels from the runner.
   *
   * This endpoint returns a `404 Not Found` status if the custom label is not
   * present on the runner.
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `administration` permission for repositories and the `organization_self_hosted_runners` permission for organizations.
   * Authenticated users must have admin access to repositories or organizations, or the `manage_runners:enterprise` scope for enterprises, to use these endpoints.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsRemoveCustomLabelFromSelfHostedRunnerForOrg$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsRemoveCustomLabelFromSelfHostedRunnerForOrg(params: ActionsRemoveCustomLabelFromSelfHostedRunnerForOrg$Params, context?: HttpContext): Observable<{
'total_count': number;
'labels': Array<RunnerLabel>;
}> {
    return this.actionsRemoveCustomLabelFromSelfHostedRunnerForOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'total_count': number;
'labels': Array<RunnerLabel>;
}>): {
'total_count': number;
'labels': Array<RunnerLabel>;
} => r.body)
    );
  }

  /** Path part for operation `actionsListOrgSecrets()` */
  static readonly ActionsListOrgSecretsPath = '/orgs/{org}/actions/secrets';

  /**
   * List organization secrets.
   *
   * Lists all secrets available in an organization without revealing their
   * encrypted values.
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `secrets` organization permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read secrets.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsListOrgSecrets()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsListOrgSecrets$Response(params: ActionsListOrgSecrets$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'secrets': Array<OrganizationActionsSecret>;
}>> {
    return actionsListOrgSecrets(this.http, this.rootUrl, params, context);
  }

  /**
   * List organization secrets.
   *
   * Lists all secrets available in an organization without revealing their
   * encrypted values.
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `secrets` organization permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read secrets.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsListOrgSecrets$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsListOrgSecrets(params: ActionsListOrgSecrets$Params, context?: HttpContext): Observable<{
'total_count': number;
'secrets': Array<OrganizationActionsSecret>;
}> {
    return this.actionsListOrgSecrets$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'total_count': number;
'secrets': Array<OrganizationActionsSecret>;
}>): {
'total_count': number;
'secrets': Array<OrganizationActionsSecret>;
} => r.body)
    );
  }

  /** Path part for operation `actionsGetOrgPublicKey()` */
  static readonly ActionsGetOrgPublicKeyPath = '/orgs/{org}/actions/secrets/public-key';

  /**
   * Get an organization public key.
   *
   * Gets your public key, which you need to encrypt secrets. You need to
   * encrypt a secret before you can create or update secrets.
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `secrets` organization permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read secrets.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsGetOrgPublicKey()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsGetOrgPublicKey$Response(params: ActionsGetOrgPublicKey$Params, context?: HttpContext): Observable<StrictHttpResponse<ActionsPublicKey>> {
    return actionsGetOrgPublicKey(this.http, this.rootUrl, params, context);
  }

  /**
   * Get an organization public key.
   *
   * Gets your public key, which you need to encrypt secrets. You need to
   * encrypt a secret before you can create or update secrets.
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `secrets` organization permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read secrets.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsGetOrgPublicKey$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsGetOrgPublicKey(params: ActionsGetOrgPublicKey$Params, context?: HttpContext): Observable<ActionsPublicKey> {
    return this.actionsGetOrgPublicKey$Response(params, context).pipe(
      map((r: StrictHttpResponse<ActionsPublicKey>): ActionsPublicKey => r.body)
    );
  }

  /** Path part for operation `actionsGetOrgSecret()` */
  static readonly ActionsGetOrgSecretPath = '/orgs/{org}/actions/secrets/{secret_name}';

  /**
   * Get an organization secret.
   *
   * Gets a single organization secret without revealing its encrypted value.
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `secrets` organization permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read secrets.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsGetOrgSecret()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsGetOrgSecret$Response(params: ActionsGetOrgSecret$Params, context?: HttpContext): Observable<StrictHttpResponse<OrganizationActionsSecret>> {
    return actionsGetOrgSecret(this.http, this.rootUrl, params, context);
  }

  /**
   * Get an organization secret.
   *
   * Gets a single organization secret without revealing its encrypted value.
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `secrets` organization permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read secrets.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsGetOrgSecret$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsGetOrgSecret(params: ActionsGetOrgSecret$Params, context?: HttpContext): Observable<OrganizationActionsSecret> {
    return this.actionsGetOrgSecret$Response(params, context).pipe(
      map((r: StrictHttpResponse<OrganizationActionsSecret>): OrganizationActionsSecret => r.body)
    );
  }

  /** Path part for operation `actionsCreateOrUpdateOrgSecret()` */
  static readonly ActionsCreateOrUpdateOrgSecretPath = '/orgs/{org}/actions/secrets/{secret_name}';

  /**
   * Create or update an organization secret.
   *
   * Creates or updates an organization secret with an encrypted value. Encrypt your secret using
   * [LibSodium](https://libsodium.gitbook.io/doc/bindings_for_other_languages). For more information, see "[Encrypting secrets for the REST API](https://docs.github.com/rest/guides/encrypting-secrets-for-the-rest-api)."
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `secrets` organization permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read secrets.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsCreateOrUpdateOrgSecret()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  actionsCreateOrUpdateOrgSecret$Response(params: ActionsCreateOrUpdateOrgSecret$Params, context?: HttpContext): Observable<StrictHttpResponse<EmptyObject>> {
    return actionsCreateOrUpdateOrgSecret(this.http, this.rootUrl, params, context);
  }

  /**
   * Create or update an organization secret.
   *
   * Creates or updates an organization secret with an encrypted value. Encrypt your secret using
   * [LibSodium](https://libsodium.gitbook.io/doc/bindings_for_other_languages). For more information, see "[Encrypting secrets for the REST API](https://docs.github.com/rest/guides/encrypting-secrets-for-the-rest-api)."
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `secrets` organization permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read secrets.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsCreateOrUpdateOrgSecret$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  actionsCreateOrUpdateOrgSecret(params: ActionsCreateOrUpdateOrgSecret$Params, context?: HttpContext): Observable<EmptyObject> {
    return this.actionsCreateOrUpdateOrgSecret$Response(params, context).pipe(
      map((r: StrictHttpResponse<EmptyObject>): EmptyObject => r.body)
    );
  }

  /** Path part for operation `actionsDeleteOrgSecret()` */
  static readonly ActionsDeleteOrgSecretPath = '/orgs/{org}/actions/secrets/{secret_name}';

  /**
   * Delete an organization secret.
   *
   * Deletes a secret in an organization using the secret name.
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `secrets` organization permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read secrets.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsDeleteOrgSecret()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsDeleteOrgSecret$Response(params: ActionsDeleteOrgSecret$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return actionsDeleteOrgSecret(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete an organization secret.
   *
   * Deletes a secret in an organization using the secret name.
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `secrets` organization permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read secrets.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsDeleteOrgSecret$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsDeleteOrgSecret(params: ActionsDeleteOrgSecret$Params, context?: HttpContext): Observable<void> {
    return this.actionsDeleteOrgSecret$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `actionsListSelectedReposForOrgSecret()` */
  static readonly ActionsListSelectedReposForOrgSecretPath = '/orgs/{org}/actions/secrets/{secret_name}/repositories';

  /**
   * List selected repositories for an organization secret.
   *
   * Lists all repositories that have been selected when the `visibility`
   * for repository access to a secret is set to `selected`.
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `secrets` organization permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read secrets.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsListSelectedReposForOrgSecret()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsListSelectedReposForOrgSecret$Response(params: ActionsListSelectedReposForOrgSecret$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'repositories': Array<MinimalRepository>;
}>> {
    return actionsListSelectedReposForOrgSecret(this.http, this.rootUrl, params, context);
  }

  /**
   * List selected repositories for an organization secret.
   *
   * Lists all repositories that have been selected when the `visibility`
   * for repository access to a secret is set to `selected`.
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `secrets` organization permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read secrets.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsListSelectedReposForOrgSecret$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsListSelectedReposForOrgSecret(params: ActionsListSelectedReposForOrgSecret$Params, context?: HttpContext): Observable<{
'total_count': number;
'repositories': Array<MinimalRepository>;
}> {
    return this.actionsListSelectedReposForOrgSecret$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'total_count': number;
'repositories': Array<MinimalRepository>;
}>): {
'total_count': number;
'repositories': Array<MinimalRepository>;
} => r.body)
    );
  }

  /** Path part for operation `actionsSetSelectedReposForOrgSecret()` */
  static readonly ActionsSetSelectedReposForOrgSecretPath = '/orgs/{org}/actions/secrets/{secret_name}/repositories';

  /**
   * Set selected repositories for an organization secret.
   *
   * Replaces all repositories for an organization secret when the `visibility`
   * for repository access is set to `selected`. The visibility is set when you [Create
   * or update an organization secret](https://docs.github.com/rest/actions/secrets#create-or-update-an-organization-secret).
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `secrets` organization permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read secrets.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsSetSelectedReposForOrgSecret()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  actionsSetSelectedReposForOrgSecret$Response(params: ActionsSetSelectedReposForOrgSecret$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return actionsSetSelectedReposForOrgSecret(this.http, this.rootUrl, params, context);
  }

  /**
   * Set selected repositories for an organization secret.
   *
   * Replaces all repositories for an organization secret when the `visibility`
   * for repository access is set to `selected`. The visibility is set when you [Create
   * or update an organization secret](https://docs.github.com/rest/actions/secrets#create-or-update-an-organization-secret).
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `secrets` organization permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read secrets.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsSetSelectedReposForOrgSecret$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  actionsSetSelectedReposForOrgSecret(params: ActionsSetSelectedReposForOrgSecret$Params, context?: HttpContext): Observable<void> {
    return this.actionsSetSelectedReposForOrgSecret$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `actionsAddSelectedRepoToOrgSecret()` */
  static readonly ActionsAddSelectedRepoToOrgSecretPath = '/orgs/{org}/actions/secrets/{secret_name}/repositories/{repository_id}';

  /**
   * Add selected repository to an organization secret.
   *
   * Adds a repository to an organization secret when the `visibility` for
   * repository access is set to `selected`. The visibility is set when you [Create or
   * update an organization secret](https://docs.github.com/rest/actions/secrets#create-or-update-an-organization-secret).
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `secrets` organization permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read secrets.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsAddSelectedRepoToOrgSecret()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsAddSelectedRepoToOrgSecret$Response(params: ActionsAddSelectedRepoToOrgSecret$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return actionsAddSelectedRepoToOrgSecret(this.http, this.rootUrl, params, context);
  }

  /**
   * Add selected repository to an organization secret.
   *
   * Adds a repository to an organization secret when the `visibility` for
   * repository access is set to `selected`. The visibility is set when you [Create or
   * update an organization secret](https://docs.github.com/rest/actions/secrets#create-or-update-an-organization-secret).
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `secrets` organization permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read secrets.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsAddSelectedRepoToOrgSecret$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsAddSelectedRepoToOrgSecret(params: ActionsAddSelectedRepoToOrgSecret$Params, context?: HttpContext): Observable<void> {
    return this.actionsAddSelectedRepoToOrgSecret$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `actionsRemoveSelectedRepoFromOrgSecret()` */
  static readonly ActionsRemoveSelectedRepoFromOrgSecretPath = '/orgs/{org}/actions/secrets/{secret_name}/repositories/{repository_id}';

  /**
   * Remove selected repository from an organization secret.
   *
   * Removes a repository from an organization secret when the `visibility`
   * for repository access is set to `selected`. The visibility is set when you [Create
   * or update an organization secret](https://docs.github.com/rest/actions/secrets#create-or-update-an-organization-secret).
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `secrets` organization permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read secrets.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsRemoveSelectedRepoFromOrgSecret()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsRemoveSelectedRepoFromOrgSecret$Response(params: ActionsRemoveSelectedRepoFromOrgSecret$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return actionsRemoveSelectedRepoFromOrgSecret(this.http, this.rootUrl, params, context);
  }

  /**
   * Remove selected repository from an organization secret.
   *
   * Removes a repository from an organization secret when the `visibility`
   * for repository access is set to `selected`. The visibility is set when you [Create
   * or update an organization secret](https://docs.github.com/rest/actions/secrets#create-or-update-an-organization-secret).
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `secrets` organization permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read secrets.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsRemoveSelectedRepoFromOrgSecret$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsRemoveSelectedRepoFromOrgSecret(params: ActionsRemoveSelectedRepoFromOrgSecret$Params, context?: HttpContext): Observable<void> {
    return this.actionsRemoveSelectedRepoFromOrgSecret$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `actionsListOrgVariables()` */
  static readonly ActionsListOrgVariablesPath = '/orgs/{org}/actions/variables';

  /**
   * List organization variables.
   *
   * Lists all organization variables.
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint. If the repository is private, you must use an access token with the `repo` scope. GitHub Apps must have the `organization_actions_variables:read` organization permission to use this endpoint. Authenticated users must have collaborator access to a repository to create, update, or read variables.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsListOrgVariables()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsListOrgVariables$Response(params: ActionsListOrgVariables$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'variables': Array<OrganizationActionsVariable>;
}>> {
    return actionsListOrgVariables(this.http, this.rootUrl, params, context);
  }

  /**
   * List organization variables.
   *
   * Lists all organization variables.
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint. If the repository is private, you must use an access token with the `repo` scope. GitHub Apps must have the `organization_actions_variables:read` organization permission to use this endpoint. Authenticated users must have collaborator access to a repository to create, update, or read variables.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsListOrgVariables$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsListOrgVariables(params: ActionsListOrgVariables$Params, context?: HttpContext): Observable<{
'total_count': number;
'variables': Array<OrganizationActionsVariable>;
}> {
    return this.actionsListOrgVariables$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'total_count': number;
'variables': Array<OrganizationActionsVariable>;
}>): {
'total_count': number;
'variables': Array<OrganizationActionsVariable>;
} => r.body)
    );
  }

  /** Path part for operation `actionsCreateOrgVariable()` */
  static readonly ActionsCreateOrgVariablePath = '/orgs/{org}/actions/variables';

  /**
   * Create an organization variable.
   *
   * Creates an organization variable that you can reference in a GitHub Actions workflow.
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `organization_actions_variables:write` organization permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read variables.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsCreateOrgVariable()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  actionsCreateOrgVariable$Response(params: ActionsCreateOrgVariable$Params, context?: HttpContext): Observable<StrictHttpResponse<EmptyObject>> {
    return actionsCreateOrgVariable(this.http, this.rootUrl, params, context);
  }

  /**
   * Create an organization variable.
   *
   * Creates an organization variable that you can reference in a GitHub Actions workflow.
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `organization_actions_variables:write` organization permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read variables.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsCreateOrgVariable$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  actionsCreateOrgVariable(params: ActionsCreateOrgVariable$Params, context?: HttpContext): Observable<EmptyObject> {
    return this.actionsCreateOrgVariable$Response(params, context).pipe(
      map((r: StrictHttpResponse<EmptyObject>): EmptyObject => r.body)
    );
  }

  /** Path part for operation `actionsGetOrgVariable()` */
  static readonly ActionsGetOrgVariablePath = '/orgs/{org}/actions/variables/{name}';

  /**
   * Get an organization variable.
   *
   * Gets a specific variable in an organization.
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `organization_actions_variables:read` organization permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read variables.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsGetOrgVariable()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsGetOrgVariable$Response(params: ActionsGetOrgVariable$Params, context?: HttpContext): Observable<StrictHttpResponse<OrganizationActionsVariable>> {
    return actionsGetOrgVariable(this.http, this.rootUrl, params, context);
  }

  /**
   * Get an organization variable.
   *
   * Gets a specific variable in an organization.
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `organization_actions_variables:read` organization permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read variables.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsGetOrgVariable$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsGetOrgVariable(params: ActionsGetOrgVariable$Params, context?: HttpContext): Observable<OrganizationActionsVariable> {
    return this.actionsGetOrgVariable$Response(params, context).pipe(
      map((r: StrictHttpResponse<OrganizationActionsVariable>): OrganizationActionsVariable => r.body)
    );
  }

  /** Path part for operation `actionsDeleteOrgVariable()` */
  static readonly ActionsDeleteOrgVariablePath = '/orgs/{org}/actions/variables/{name}';

  /**
   * Delete an organization variable.
   *
   * Deletes an organization variable using the variable name.
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `organization_actions_variables:write` organization permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read variables.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsDeleteOrgVariable()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsDeleteOrgVariable$Response(params: ActionsDeleteOrgVariable$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return actionsDeleteOrgVariable(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete an organization variable.
   *
   * Deletes an organization variable using the variable name.
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `organization_actions_variables:write` organization permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read variables.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsDeleteOrgVariable$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsDeleteOrgVariable(params: ActionsDeleteOrgVariable$Params, context?: HttpContext): Observable<void> {
    return this.actionsDeleteOrgVariable$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `actionsUpdateOrgVariable()` */
  static readonly ActionsUpdateOrgVariablePath = '/orgs/{org}/actions/variables/{name}';

  /**
   * Update an organization variable.
   *
   * Updates an organization variable that you can reference in a GitHub Actions workflow.
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `organization_actions_variables:write` organization permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read variables.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsUpdateOrgVariable()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  actionsUpdateOrgVariable$Response(params: ActionsUpdateOrgVariable$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return actionsUpdateOrgVariable(this.http, this.rootUrl, params, context);
  }

  /**
   * Update an organization variable.
   *
   * Updates an organization variable that you can reference in a GitHub Actions workflow.
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `organization_actions_variables:write` organization permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read variables.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsUpdateOrgVariable$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  actionsUpdateOrgVariable(params: ActionsUpdateOrgVariable$Params, context?: HttpContext): Observable<void> {
    return this.actionsUpdateOrgVariable$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `actionsListSelectedReposForOrgVariable()` */
  static readonly ActionsListSelectedReposForOrgVariablePath = '/orgs/{org}/actions/variables/{name}/repositories';

  /**
   * List selected repositories for an organization variable.
   *
   * Lists all repositories that can access an organization variable
   * that is available to selected repositories.
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `organization_actions_variables:read` organization permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read variables.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsListSelectedReposForOrgVariable()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsListSelectedReposForOrgVariable$Response(params: ActionsListSelectedReposForOrgVariable$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'repositories': Array<MinimalRepository>;
}>> {
    return actionsListSelectedReposForOrgVariable(this.http, this.rootUrl, params, context);
  }

  /**
   * List selected repositories for an organization variable.
   *
   * Lists all repositories that can access an organization variable
   * that is available to selected repositories.
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `organization_actions_variables:read` organization permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read variables.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsListSelectedReposForOrgVariable$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsListSelectedReposForOrgVariable(params: ActionsListSelectedReposForOrgVariable$Params, context?: HttpContext): Observable<{
'total_count': number;
'repositories': Array<MinimalRepository>;
}> {
    return this.actionsListSelectedReposForOrgVariable$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'total_count': number;
'repositories': Array<MinimalRepository>;
}>): {
'total_count': number;
'repositories': Array<MinimalRepository>;
} => r.body)
    );
  }

  /** Path part for operation `actionsSetSelectedReposForOrgVariable()` */
  static readonly ActionsSetSelectedReposForOrgVariablePath = '/orgs/{org}/actions/variables/{name}/repositories';

  /**
   * Set selected repositories for an organization variable.
   *
   * Replaces all repositories for an organization variable that is available
   * to selected repositories. Organization variables that are available to selected
   * repositories have their `visibility` field set to `selected`.
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `organization_actions_variables:write` organization permission to use this
   * endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read variables.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsSetSelectedReposForOrgVariable()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  actionsSetSelectedReposForOrgVariable$Response(params: ActionsSetSelectedReposForOrgVariable$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return actionsSetSelectedReposForOrgVariable(this.http, this.rootUrl, params, context);
  }

  /**
   * Set selected repositories for an organization variable.
   *
   * Replaces all repositories for an organization variable that is available
   * to selected repositories. Organization variables that are available to selected
   * repositories have their `visibility` field set to `selected`.
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `organization_actions_variables:write` organization permission to use this
   * endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read variables.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsSetSelectedReposForOrgVariable$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  actionsSetSelectedReposForOrgVariable(params: ActionsSetSelectedReposForOrgVariable$Params, context?: HttpContext): Observable<void> {
    return this.actionsSetSelectedReposForOrgVariable$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `actionsAddSelectedRepoToOrgVariable()` */
  static readonly ActionsAddSelectedRepoToOrgVariablePath = '/orgs/{org}/actions/variables/{name}/repositories/{repository_id}';

  /**
   * Add selected repository to an organization variable.
   *
   * Adds a repository to an organization variable that is available to selected repositories.
   * Organization variables that are available to selected repositories have their `visibility` field set to `selected`.
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `organization_actions_variables:write` organization permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read variables.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsAddSelectedRepoToOrgVariable()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsAddSelectedRepoToOrgVariable$Response(params: ActionsAddSelectedRepoToOrgVariable$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return actionsAddSelectedRepoToOrgVariable(this.http, this.rootUrl, params, context);
  }

  /**
   * Add selected repository to an organization variable.
   *
   * Adds a repository to an organization variable that is available to selected repositories.
   * Organization variables that are available to selected repositories have their `visibility` field set to `selected`.
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `organization_actions_variables:write` organization permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read variables.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsAddSelectedRepoToOrgVariable$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsAddSelectedRepoToOrgVariable(params: ActionsAddSelectedRepoToOrgVariable$Params, context?: HttpContext): Observable<void> {
    return this.actionsAddSelectedRepoToOrgVariable$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `actionsRemoveSelectedRepoFromOrgVariable()` */
  static readonly ActionsRemoveSelectedRepoFromOrgVariablePath = '/orgs/{org}/actions/variables/{name}/repositories/{repository_id}';

  /**
   * Remove selected repository from an organization variable.
   *
   * Removes a repository from an organization variable that is
   * available to selected repositories. Organization variables that are available to
   * selected repositories have their `visibility` field set to `selected`.
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `organization_actions_variables:write` organization permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read variables.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsRemoveSelectedRepoFromOrgVariable()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsRemoveSelectedRepoFromOrgVariable$Response(params: ActionsRemoveSelectedRepoFromOrgVariable$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return actionsRemoveSelectedRepoFromOrgVariable(this.http, this.rootUrl, params, context);
  }

  /**
   * Remove selected repository from an organization variable.
   *
   * Removes a repository from an organization variable that is
   * available to selected repositories. Organization variables that are available to
   * selected repositories have their `visibility` field set to `selected`.
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `organization_actions_variables:write` organization permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read variables.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsRemoveSelectedRepoFromOrgVariable$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsRemoveSelectedRepoFromOrgVariable(params: ActionsRemoveSelectedRepoFromOrgVariable$Params, context?: HttpContext): Observable<void> {
    return this.actionsRemoveSelectedRepoFromOrgVariable$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `actionsListArtifactsForRepo()` */
  static readonly ActionsListArtifactsForRepoPath = '/repos/{owner}/{repo}/actions/artifacts';

  /**
   * List artifacts for a repository.
   *
   * Lists all artifacts for a repository. Anyone with read access to the repository can use this endpoint. If the repository is private you must use an access token with the `repo` scope. GitHub Apps must have the `actions:read` permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsListArtifactsForRepo()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsListArtifactsForRepo$Response(params: ActionsListArtifactsForRepo$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'artifacts': Array<Artifact>;
}>> {
    return actionsListArtifactsForRepo(this.http, this.rootUrl, params, context);
  }

  /**
   * List artifacts for a repository.
   *
   * Lists all artifacts for a repository. Anyone with read access to the repository can use this endpoint. If the repository is private you must use an access token with the `repo` scope. GitHub Apps must have the `actions:read` permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsListArtifactsForRepo$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsListArtifactsForRepo(params: ActionsListArtifactsForRepo$Params, context?: HttpContext): Observable<{
'total_count': number;
'artifacts': Array<Artifact>;
}> {
    return this.actionsListArtifactsForRepo$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'total_count': number;
'artifacts': Array<Artifact>;
}>): {
'total_count': number;
'artifacts': Array<Artifact>;
} => r.body)
    );
  }

  /** Path part for operation `actionsGetArtifact()` */
  static readonly ActionsGetArtifactPath = '/repos/{owner}/{repo}/actions/artifacts/{artifact_id}';

  /**
   * Get an artifact.
   *
   * Gets a specific artifact for a workflow run. Anyone with read access to the repository can use this endpoint. If the repository is private you must use an access token with the `repo` scope. GitHub Apps must have the `actions:read` permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsGetArtifact()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsGetArtifact$Response(params: ActionsGetArtifact$Params, context?: HttpContext): Observable<StrictHttpResponse<Artifact>> {
    return actionsGetArtifact(this.http, this.rootUrl, params, context);
  }

  /**
   * Get an artifact.
   *
   * Gets a specific artifact for a workflow run. Anyone with read access to the repository can use this endpoint. If the repository is private you must use an access token with the `repo` scope. GitHub Apps must have the `actions:read` permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsGetArtifact$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsGetArtifact(params: ActionsGetArtifact$Params, context?: HttpContext): Observable<Artifact> {
    return this.actionsGetArtifact$Response(params, context).pipe(
      map((r: StrictHttpResponse<Artifact>): Artifact => r.body)
    );
  }

  /** Path part for operation `actionsDeleteArtifact()` */
  static readonly ActionsDeleteArtifactPath = '/repos/{owner}/{repo}/actions/artifacts/{artifact_id}';

  /**
   * Delete an artifact.
   *
   * Deletes an artifact for a workflow run. You must authenticate using an access token with the `repo` scope to use this endpoint. GitHub Apps must have the `actions:write` permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsDeleteArtifact()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsDeleteArtifact$Response(params: ActionsDeleteArtifact$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return actionsDeleteArtifact(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete an artifact.
   *
   * Deletes an artifact for a workflow run. You must authenticate using an access token with the `repo` scope to use this endpoint. GitHub Apps must have the `actions:write` permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsDeleteArtifact$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsDeleteArtifact(params: ActionsDeleteArtifact$Params, context?: HttpContext): Observable<void> {
    return this.actionsDeleteArtifact$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `actionsDownloadArtifact()` */
  static readonly ActionsDownloadArtifactPath = '/repos/{owner}/{repo}/actions/artifacts/{artifact_id}/{archive_format}';

  /**
   * Download an artifact.
   *
   * Gets a redirect URL to download an archive for a repository. This URL expires after 1 minute. Look for `Location:` in
   * the response header to find the URL for the download. The `:archive_format` must be `zip`.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * GitHub Apps must have the `actions:read` permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsDownloadArtifact()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsDownloadArtifact$Response(params: ActionsDownloadArtifact$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return actionsDownloadArtifact(this.http, this.rootUrl, params, context);
  }

  /**
   * Download an artifact.
   *
   * Gets a redirect URL to download an archive for a repository. This URL expires after 1 minute. Look for `Location:` in
   * the response header to find the URL for the download. The `:archive_format` must be `zip`.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * GitHub Apps must have the `actions:read` permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsDownloadArtifact$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsDownloadArtifact(params: ActionsDownloadArtifact$Params, context?: HttpContext): Observable<void> {
    return this.actionsDownloadArtifact$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `actionsGetActionsCacheUsage()` */
  static readonly ActionsGetActionsCacheUsagePath = '/repos/{owner}/{repo}/actions/cache/usage';

  /**
   * Get GitHub Actions cache usage for a repository.
   *
   * Gets GitHub Actions cache usage for a repository.
   * The data fetched using this API is refreshed approximately every 5 minutes, so values returned from this endpoint may take at least 5 minutes to get updated.
   * Anyone with read access to the repository can use this endpoint. If the repository is private, you must use an access token with the `repo` scope. GitHub Apps must have the `actions:read` permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsGetActionsCacheUsage()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsGetActionsCacheUsage$Response(params: ActionsGetActionsCacheUsage$Params, context?: HttpContext): Observable<StrictHttpResponse<ActionsCacheUsageByRepository>> {
    return actionsGetActionsCacheUsage(this.http, this.rootUrl, params, context);
  }

  /**
   * Get GitHub Actions cache usage for a repository.
   *
   * Gets GitHub Actions cache usage for a repository.
   * The data fetched using this API is refreshed approximately every 5 minutes, so values returned from this endpoint may take at least 5 minutes to get updated.
   * Anyone with read access to the repository can use this endpoint. If the repository is private, you must use an access token with the `repo` scope. GitHub Apps must have the `actions:read` permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsGetActionsCacheUsage$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsGetActionsCacheUsage(params: ActionsGetActionsCacheUsage$Params, context?: HttpContext): Observable<ActionsCacheUsageByRepository> {
    return this.actionsGetActionsCacheUsage$Response(params, context).pipe(
      map((r: StrictHttpResponse<ActionsCacheUsageByRepository>): ActionsCacheUsageByRepository => r.body)
    );
  }

  /** Path part for operation `actionsGetActionsCacheList()` */
  static readonly ActionsGetActionsCacheListPath = '/repos/{owner}/{repo}/actions/caches';

  /**
   * List GitHub Actions caches for a repository.
   *
   * Lists the GitHub Actions caches for a repository.
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * GitHub Apps must have the `actions:read` permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsGetActionsCacheList()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsGetActionsCacheList$Response(params: ActionsGetActionsCacheList$Params, context?: HttpContext): Observable<StrictHttpResponse<ActionsCacheList>> {
    return actionsGetActionsCacheList(this.http, this.rootUrl, params, context);
  }

  /**
   * List GitHub Actions caches for a repository.
   *
   * Lists the GitHub Actions caches for a repository.
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * GitHub Apps must have the `actions:read` permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsGetActionsCacheList$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsGetActionsCacheList(params: ActionsGetActionsCacheList$Params, context?: HttpContext): Observable<ActionsCacheList> {
    return this.actionsGetActionsCacheList$Response(params, context).pipe(
      map((r: StrictHttpResponse<ActionsCacheList>): ActionsCacheList => r.body)
    );
  }

  /** Path part for operation `actionsDeleteActionsCacheByKey()` */
  static readonly ActionsDeleteActionsCacheByKeyPath = '/repos/{owner}/{repo}/actions/caches';

  /**
   * Delete GitHub Actions caches for a repository (using a cache key).
   *
   * Deletes one or more GitHub Actions caches for a repository, using a complete cache key. By default, all caches that match the provided key are deleted, but you can optionally provide a Git ref to restrict deletions to caches that match both the provided key and the Git ref.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   *
   * GitHub Apps must have the `actions:write` permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsDeleteActionsCacheByKey()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsDeleteActionsCacheByKey$Response(params: ActionsDeleteActionsCacheByKey$Params, context?: HttpContext): Observable<StrictHttpResponse<ActionsCacheList>> {
    return actionsDeleteActionsCacheByKey(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete GitHub Actions caches for a repository (using a cache key).
   *
   * Deletes one or more GitHub Actions caches for a repository, using a complete cache key. By default, all caches that match the provided key are deleted, but you can optionally provide a Git ref to restrict deletions to caches that match both the provided key and the Git ref.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   *
   * GitHub Apps must have the `actions:write` permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsDeleteActionsCacheByKey$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsDeleteActionsCacheByKey(params: ActionsDeleteActionsCacheByKey$Params, context?: HttpContext): Observable<ActionsCacheList> {
    return this.actionsDeleteActionsCacheByKey$Response(params, context).pipe(
      map((r: StrictHttpResponse<ActionsCacheList>): ActionsCacheList => r.body)
    );
  }

  /** Path part for operation `actionsDeleteActionsCacheById()` */
  static readonly ActionsDeleteActionsCacheByIdPath = '/repos/{owner}/{repo}/actions/caches/{cache_id}';

  /**
   * Delete a GitHub Actions cache for a repository (using a cache ID).
   *
   * Deletes a GitHub Actions cache for a repository, using a cache ID.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   *
   * GitHub Apps must have the `actions:write` permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsDeleteActionsCacheById()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsDeleteActionsCacheById$Response(params: ActionsDeleteActionsCacheById$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return actionsDeleteActionsCacheById(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete a GitHub Actions cache for a repository (using a cache ID).
   *
   * Deletes a GitHub Actions cache for a repository, using a cache ID.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   *
   * GitHub Apps must have the `actions:write` permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsDeleteActionsCacheById$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsDeleteActionsCacheById(params: ActionsDeleteActionsCacheById$Params, context?: HttpContext): Observable<void> {
    return this.actionsDeleteActionsCacheById$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `actionsGetJobForWorkflowRun()` */
  static readonly ActionsGetJobForWorkflowRunPath = '/repos/{owner}/{repo}/actions/jobs/{job_id}';

  /**
   * Get a job for a workflow run.
   *
   * Gets a specific job in a workflow run. Anyone with read access to the repository can use this endpoint. If the repository is private you must use an access token with the `repo` scope. GitHub Apps must have the `actions:read` permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsGetJobForWorkflowRun()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsGetJobForWorkflowRun$Response(params: ActionsGetJobForWorkflowRun$Params, context?: HttpContext): Observable<StrictHttpResponse<Job>> {
    return actionsGetJobForWorkflowRun(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a job for a workflow run.
   *
   * Gets a specific job in a workflow run. Anyone with read access to the repository can use this endpoint. If the repository is private you must use an access token with the `repo` scope. GitHub Apps must have the `actions:read` permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsGetJobForWorkflowRun$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsGetJobForWorkflowRun(params: ActionsGetJobForWorkflowRun$Params, context?: HttpContext): Observable<Job> {
    return this.actionsGetJobForWorkflowRun$Response(params, context).pipe(
      map((r: StrictHttpResponse<Job>): Job => r.body)
    );
  }

  /** Path part for operation `actionsDownloadJobLogsForWorkflowRun()` */
  static readonly ActionsDownloadJobLogsForWorkflowRunPath = '/repos/{owner}/{repo}/actions/jobs/{job_id}/logs';

  /**
   * Download job logs for a workflow run.
   *
   * Gets a redirect URL to download a plain text file of logs for a workflow job. This link expires after 1 minute. Look
   * for `Location:` in the response header to find the URL for the download. Anyone with read access to the repository can
   * use this endpoint. If the repository is private you must use an access token with the `repo` scope. GitHub Apps must
   * have the `actions:read` permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsDownloadJobLogsForWorkflowRun()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsDownloadJobLogsForWorkflowRun$Response(params: ActionsDownloadJobLogsForWorkflowRun$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return actionsDownloadJobLogsForWorkflowRun(this.http, this.rootUrl, params, context);
  }

  /**
   * Download job logs for a workflow run.
   *
   * Gets a redirect URL to download a plain text file of logs for a workflow job. This link expires after 1 minute. Look
   * for `Location:` in the response header to find the URL for the download. Anyone with read access to the repository can
   * use this endpoint. If the repository is private you must use an access token with the `repo` scope. GitHub Apps must
   * have the `actions:read` permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsDownloadJobLogsForWorkflowRun$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsDownloadJobLogsForWorkflowRun(params: ActionsDownloadJobLogsForWorkflowRun$Params, context?: HttpContext): Observable<void> {
    return this.actionsDownloadJobLogsForWorkflowRun$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `actionsReRunJobForWorkflowRun()` */
  static readonly ActionsReRunJobForWorkflowRunPath = '/repos/{owner}/{repo}/actions/jobs/{job_id}/rerun';

  /**
   * Re-run a job from a workflow run.
   *
   * Re-run a job and its dependent jobs in a workflow run.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `actions:write` permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsReRunJobForWorkflowRun()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  actionsReRunJobForWorkflowRun$Response(params: ActionsReRunJobForWorkflowRun$Params, context?: HttpContext): Observable<StrictHttpResponse<EmptyObject>> {
    return actionsReRunJobForWorkflowRun(this.http, this.rootUrl, params, context);
  }

  /**
   * Re-run a job from a workflow run.
   *
   * Re-run a job and its dependent jobs in a workflow run.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `actions:write` permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsReRunJobForWorkflowRun$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  actionsReRunJobForWorkflowRun(params: ActionsReRunJobForWorkflowRun$Params, context?: HttpContext): Observable<EmptyObject> {
    return this.actionsReRunJobForWorkflowRun$Response(params, context).pipe(
      map((r: StrictHttpResponse<EmptyObject>): EmptyObject => r.body)
    );
  }

  /** Path part for operation `actionsGetCustomOidcSubClaimForRepo()` */
  static readonly ActionsGetCustomOidcSubClaimForRepoPath = '/repos/{owner}/{repo}/actions/oidc/customization/sub';

  /**
   * Get the customization template for an OIDC subject claim for a repository.
   *
   * Gets the customization template for an OpenID Connect (OIDC) subject claim.
   * You must authenticate using an access token with the `repo` scope to use this
   * endpoint. GitHub Apps must have the `organization_administration:read` permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsGetCustomOidcSubClaimForRepo()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsGetCustomOidcSubClaimForRepo$Response(params: ActionsGetCustomOidcSubClaimForRepo$Params, context?: HttpContext): Observable<StrictHttpResponse<OidcCustomSubRepo>> {
    return actionsGetCustomOidcSubClaimForRepo(this.http, this.rootUrl, params, context);
  }

  /**
   * Get the customization template for an OIDC subject claim for a repository.
   *
   * Gets the customization template for an OpenID Connect (OIDC) subject claim.
   * You must authenticate using an access token with the `repo` scope to use this
   * endpoint. GitHub Apps must have the `organization_administration:read` permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsGetCustomOidcSubClaimForRepo$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsGetCustomOidcSubClaimForRepo(params: ActionsGetCustomOidcSubClaimForRepo$Params, context?: HttpContext): Observable<OidcCustomSubRepo> {
    return this.actionsGetCustomOidcSubClaimForRepo$Response(params, context).pipe(
      map((r: StrictHttpResponse<OidcCustomSubRepo>): OidcCustomSubRepo => r.body)
    );
  }

  /** Path part for operation `actionsSetCustomOidcSubClaimForRepo()` */
  static readonly ActionsSetCustomOidcSubClaimForRepoPath = '/repos/{owner}/{repo}/actions/oidc/customization/sub';

  /**
   * Set the customization template for an OIDC subject claim for a repository.
   *
   * Sets the customization template and `opt-in` or `opt-out` flag for an OpenID Connect (OIDC) subject claim for a repository.
   * You must authenticate using an access token with the `repo` scope to use this
   * endpoint. GitHub Apps must have the `actions:write` permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsSetCustomOidcSubClaimForRepo()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  actionsSetCustomOidcSubClaimForRepo$Response(params: ActionsSetCustomOidcSubClaimForRepo$Params, context?: HttpContext): Observable<StrictHttpResponse<EmptyObject>> {
    return actionsSetCustomOidcSubClaimForRepo(this.http, this.rootUrl, params, context);
  }

  /**
   * Set the customization template for an OIDC subject claim for a repository.
   *
   * Sets the customization template and `opt-in` or `opt-out` flag for an OpenID Connect (OIDC) subject claim for a repository.
   * You must authenticate using an access token with the `repo` scope to use this
   * endpoint. GitHub Apps must have the `actions:write` permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsSetCustomOidcSubClaimForRepo$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  actionsSetCustomOidcSubClaimForRepo(params: ActionsSetCustomOidcSubClaimForRepo$Params, context?: HttpContext): Observable<EmptyObject> {
    return this.actionsSetCustomOidcSubClaimForRepo$Response(params, context).pipe(
      map((r: StrictHttpResponse<EmptyObject>): EmptyObject => r.body)
    );
  }

  /** Path part for operation `actionsListRepoOrganizationSecrets()` */
  static readonly ActionsListRepoOrganizationSecretsPath = '/repos/{owner}/{repo}/actions/organization-secrets';

  /**
   * List repository organization secrets.
   *
   * Lists all organization secrets shared with a repository without revealing their encrypted
   * values.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * GitHub Apps must have the `secrets` repository permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read secrets.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsListRepoOrganizationSecrets()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsListRepoOrganizationSecrets$Response(params: ActionsListRepoOrganizationSecrets$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'secrets': Array<ActionsSecret>;
}>> {
    return actionsListRepoOrganizationSecrets(this.http, this.rootUrl, params, context);
  }

  /**
   * List repository organization secrets.
   *
   * Lists all organization secrets shared with a repository without revealing their encrypted
   * values.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * GitHub Apps must have the `secrets` repository permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read secrets.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsListRepoOrganizationSecrets$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsListRepoOrganizationSecrets(params: ActionsListRepoOrganizationSecrets$Params, context?: HttpContext): Observable<{
'total_count': number;
'secrets': Array<ActionsSecret>;
}> {
    return this.actionsListRepoOrganizationSecrets$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'total_count': number;
'secrets': Array<ActionsSecret>;
}>): {
'total_count': number;
'secrets': Array<ActionsSecret>;
} => r.body)
    );
  }

  /** Path part for operation `actionsListRepoOrganizationVariables()` */
  static readonly ActionsListRepoOrganizationVariablesPath = '/repos/{owner}/{repo}/actions/organization-variables';

  /**
   * List repository organization variables.
   *
   * Lists all organiation variables shared with a repository.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `actions_variables:read` repository permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read variables.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsListRepoOrganizationVariables()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsListRepoOrganizationVariables$Response(params: ActionsListRepoOrganizationVariables$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'variables': Array<ActionsVariable>;
}>> {
    return actionsListRepoOrganizationVariables(this.http, this.rootUrl, params, context);
  }

  /**
   * List repository organization variables.
   *
   * Lists all organiation variables shared with a repository.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `actions_variables:read` repository permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read variables.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsListRepoOrganizationVariables$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsListRepoOrganizationVariables(params: ActionsListRepoOrganizationVariables$Params, context?: HttpContext): Observable<{
'total_count': number;
'variables': Array<ActionsVariable>;
}> {
    return this.actionsListRepoOrganizationVariables$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'total_count': number;
'variables': Array<ActionsVariable>;
}>): {
'total_count': number;
'variables': Array<ActionsVariable>;
} => r.body)
    );
  }

  /** Path part for operation `actionsGetGithubActionsPermissionsRepository()` */
  static readonly ActionsGetGithubActionsPermissionsRepositoryPath = '/repos/{owner}/{repo}/actions/permissions';

  /**
   * Get GitHub Actions permissions for a repository.
   *
   * Gets the GitHub Actions permissions policy for a repository, including whether GitHub Actions is enabled and the actions and reusable workflows allowed to run in the repository.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint. GitHub Apps must have the `administration` repository permission to use this API.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsGetGithubActionsPermissionsRepository()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsGetGithubActionsPermissionsRepository$Response(params: ActionsGetGithubActionsPermissionsRepository$Params, context?: HttpContext): Observable<StrictHttpResponse<ActionsRepositoryPermissions>> {
    return actionsGetGithubActionsPermissionsRepository(this.http, this.rootUrl, params, context);
  }

  /**
   * Get GitHub Actions permissions for a repository.
   *
   * Gets the GitHub Actions permissions policy for a repository, including whether GitHub Actions is enabled and the actions and reusable workflows allowed to run in the repository.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint. GitHub Apps must have the `administration` repository permission to use this API.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsGetGithubActionsPermissionsRepository$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsGetGithubActionsPermissionsRepository(params: ActionsGetGithubActionsPermissionsRepository$Params, context?: HttpContext): Observable<ActionsRepositoryPermissions> {
    return this.actionsGetGithubActionsPermissionsRepository$Response(params, context).pipe(
      map((r: StrictHttpResponse<ActionsRepositoryPermissions>): ActionsRepositoryPermissions => r.body)
    );
  }

  /** Path part for operation `actionsSetGithubActionsPermissionsRepository()` */
  static readonly ActionsSetGithubActionsPermissionsRepositoryPath = '/repos/{owner}/{repo}/actions/permissions';

  /**
   * Set GitHub Actions permissions for a repository.
   *
   * Sets the GitHub Actions permissions policy for enabling GitHub Actions and allowed actions and reusable workflows in the repository.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint. GitHub Apps must have the `administration` repository permission to use this API.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsSetGithubActionsPermissionsRepository()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  actionsSetGithubActionsPermissionsRepository$Response(params: ActionsSetGithubActionsPermissionsRepository$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return actionsSetGithubActionsPermissionsRepository(this.http, this.rootUrl, params, context);
  }

  /**
   * Set GitHub Actions permissions for a repository.
   *
   * Sets the GitHub Actions permissions policy for enabling GitHub Actions and allowed actions and reusable workflows in the repository.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint. GitHub Apps must have the `administration` repository permission to use this API.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsSetGithubActionsPermissionsRepository$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  actionsSetGithubActionsPermissionsRepository(params: ActionsSetGithubActionsPermissionsRepository$Params, context?: HttpContext): Observable<void> {
    return this.actionsSetGithubActionsPermissionsRepository$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `actionsGetWorkflowAccessToRepository()` */
  static readonly ActionsGetWorkflowAccessToRepositoryPath = '/repos/{owner}/{repo}/actions/permissions/access';

  /**
   * Get the level of access for workflows outside of the repository.
   *
   * Gets the level of access that workflows outside of the repository have to actions and reusable workflows in the repository.
   * This endpoint only applies to private repositories.
   * For more information, see "[Allowing access to components in a private repository](https://docs.github.com/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository#allowing-access-to-components-in-a-private-repository)."
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint. GitHub Apps must have the
   * repository `administration` permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsGetWorkflowAccessToRepository()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsGetWorkflowAccessToRepository$Response(params: ActionsGetWorkflowAccessToRepository$Params, context?: HttpContext): Observable<StrictHttpResponse<ActionsWorkflowAccessToRepository>> {
    return actionsGetWorkflowAccessToRepository(this.http, this.rootUrl, params, context);
  }

  /**
   * Get the level of access for workflows outside of the repository.
   *
   * Gets the level of access that workflows outside of the repository have to actions and reusable workflows in the repository.
   * This endpoint only applies to private repositories.
   * For more information, see "[Allowing access to components in a private repository](https://docs.github.com/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository#allowing-access-to-components-in-a-private-repository)."
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint. GitHub Apps must have the
   * repository `administration` permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsGetWorkflowAccessToRepository$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsGetWorkflowAccessToRepository(params: ActionsGetWorkflowAccessToRepository$Params, context?: HttpContext): Observable<ActionsWorkflowAccessToRepository> {
    return this.actionsGetWorkflowAccessToRepository$Response(params, context).pipe(
      map((r: StrictHttpResponse<ActionsWorkflowAccessToRepository>): ActionsWorkflowAccessToRepository => r.body)
    );
  }

  /** Path part for operation `actionsSetWorkflowAccessToRepository()` */
  static readonly ActionsSetWorkflowAccessToRepositoryPath = '/repos/{owner}/{repo}/actions/permissions/access';

  /**
   * Set the level of access for workflows outside of the repository.
   *
   * Sets the level of access that workflows outside of the repository have to actions and reusable workflows in the repository.
   * This endpoint only applies to private repositories.
   * For more information, see "[Allowing access to components in a private repository](https://docs.github.com/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository#allowing-access-to-components-in-a-private-repository)".
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint. GitHub Apps must have the
   * repository `administration` permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsSetWorkflowAccessToRepository()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  actionsSetWorkflowAccessToRepository$Response(params: ActionsSetWorkflowAccessToRepository$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return actionsSetWorkflowAccessToRepository(this.http, this.rootUrl, params, context);
  }

  /**
   * Set the level of access for workflows outside of the repository.
   *
   * Sets the level of access that workflows outside of the repository have to actions and reusable workflows in the repository.
   * This endpoint only applies to private repositories.
   * For more information, see "[Allowing access to components in a private repository](https://docs.github.com/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository#allowing-access-to-components-in-a-private-repository)".
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint. GitHub Apps must have the
   * repository `administration` permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsSetWorkflowAccessToRepository$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  actionsSetWorkflowAccessToRepository(params: ActionsSetWorkflowAccessToRepository$Params, context?: HttpContext): Observable<void> {
    return this.actionsSetWorkflowAccessToRepository$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `actionsGetAllowedActionsRepository()` */
  static readonly ActionsGetAllowedActionsRepositoryPath = '/repos/{owner}/{repo}/actions/permissions/selected-actions';

  /**
   * Get allowed actions and reusable workflows for a repository.
   *
   * Gets the settings for selected actions and reusable workflows that are allowed in a repository. To use this endpoint, the repository policy for `allowed_actions` must be configured to `selected`. For more information, see "[Set GitHub Actions permissions for a repository](#set-github-actions-permissions-for-a-repository)."
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint. GitHub Apps must have the `administration` repository permission to use this API.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsGetAllowedActionsRepository()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsGetAllowedActionsRepository$Response(params: ActionsGetAllowedActionsRepository$Params, context?: HttpContext): Observable<StrictHttpResponse<SelectedActions>> {
    return actionsGetAllowedActionsRepository(this.http, this.rootUrl, params, context);
  }

  /**
   * Get allowed actions and reusable workflows for a repository.
   *
   * Gets the settings for selected actions and reusable workflows that are allowed in a repository. To use this endpoint, the repository policy for `allowed_actions` must be configured to `selected`. For more information, see "[Set GitHub Actions permissions for a repository](#set-github-actions-permissions-for-a-repository)."
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint. GitHub Apps must have the `administration` repository permission to use this API.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsGetAllowedActionsRepository$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsGetAllowedActionsRepository(params: ActionsGetAllowedActionsRepository$Params, context?: HttpContext): Observable<SelectedActions> {
    return this.actionsGetAllowedActionsRepository$Response(params, context).pipe(
      map((r: StrictHttpResponse<SelectedActions>): SelectedActions => r.body)
    );
  }

  /** Path part for operation `actionsSetAllowedActionsRepository()` */
  static readonly ActionsSetAllowedActionsRepositoryPath = '/repos/{owner}/{repo}/actions/permissions/selected-actions';

  /**
   * Set allowed actions and reusable workflows for a repository.
   *
   * Sets the actions and reusable workflows that are allowed in a repository. To use this endpoint, the repository permission policy for `allowed_actions` must be configured to `selected`. For more information, see "[Set GitHub Actions permissions for a repository](#set-github-actions-permissions-for-a-repository)."
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint. GitHub Apps must have the `administration` repository permission to use this API.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsSetAllowedActionsRepository()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  actionsSetAllowedActionsRepository$Response(params: ActionsSetAllowedActionsRepository$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return actionsSetAllowedActionsRepository(this.http, this.rootUrl, params, context);
  }

  /**
   * Set allowed actions and reusable workflows for a repository.
   *
   * Sets the actions and reusable workflows that are allowed in a repository. To use this endpoint, the repository permission policy for `allowed_actions` must be configured to `selected`. For more information, see "[Set GitHub Actions permissions for a repository](#set-github-actions-permissions-for-a-repository)."
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint. GitHub Apps must have the `administration` repository permission to use this API.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsSetAllowedActionsRepository$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  actionsSetAllowedActionsRepository(params: ActionsSetAllowedActionsRepository$Params, context?: HttpContext): Observable<void> {
    return this.actionsSetAllowedActionsRepository$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `actionsGetGithubActionsDefaultWorkflowPermissionsRepository()` */
  static readonly ActionsGetGithubActionsDefaultWorkflowPermissionsRepositoryPath = '/repos/{owner}/{repo}/actions/permissions/workflow';

  /**
   * Get default workflow permissions for a repository.
   *
   * Gets the default workflow permissions granted to the `GITHUB_TOKEN` when running workflows in a repository,
   * as well as if GitHub Actions can submit approving pull request reviews.
   * For more information, see "[Setting the permissions of the GITHUB_TOKEN for your repository](https://docs.github.com/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository#setting-the-permissions-of-the-github_token-for-your-repository)."
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint. GitHub Apps must have the repository `administration` permission to use this API.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsGetGithubActionsDefaultWorkflowPermissionsRepository()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsGetGithubActionsDefaultWorkflowPermissionsRepository$Response(params: ActionsGetGithubActionsDefaultWorkflowPermissionsRepository$Params, context?: HttpContext): Observable<StrictHttpResponse<ActionsGetDefaultWorkflowPermissions>> {
    return actionsGetGithubActionsDefaultWorkflowPermissionsRepository(this.http, this.rootUrl, params, context);
  }

  /**
   * Get default workflow permissions for a repository.
   *
   * Gets the default workflow permissions granted to the `GITHUB_TOKEN` when running workflows in a repository,
   * as well as if GitHub Actions can submit approving pull request reviews.
   * For more information, see "[Setting the permissions of the GITHUB_TOKEN for your repository](https://docs.github.com/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository#setting-the-permissions-of-the-github_token-for-your-repository)."
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint. GitHub Apps must have the repository `administration` permission to use this API.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsGetGithubActionsDefaultWorkflowPermissionsRepository$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsGetGithubActionsDefaultWorkflowPermissionsRepository(params: ActionsGetGithubActionsDefaultWorkflowPermissionsRepository$Params, context?: HttpContext): Observable<ActionsGetDefaultWorkflowPermissions> {
    return this.actionsGetGithubActionsDefaultWorkflowPermissionsRepository$Response(params, context).pipe(
      map((r: StrictHttpResponse<ActionsGetDefaultWorkflowPermissions>): ActionsGetDefaultWorkflowPermissions => r.body)
    );
  }

  /** Path part for operation `actionsSetGithubActionsDefaultWorkflowPermissionsRepository()` */
  static readonly ActionsSetGithubActionsDefaultWorkflowPermissionsRepositoryPath = '/repos/{owner}/{repo}/actions/permissions/workflow';

  /**
   * Set default workflow permissions for a repository.
   *
   * Sets the default workflow permissions granted to the `GITHUB_TOKEN` when running workflows in a repository, and sets if GitHub Actions
   * can submit approving pull request reviews.
   * For more information, see "[Setting the permissions of the GITHUB_TOKEN for your repository](https://docs.github.com/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository#setting-the-permissions-of-the-github_token-for-your-repository)."
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint. GitHub Apps must have the repository `administration` permission to use this API.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsSetGithubActionsDefaultWorkflowPermissionsRepository()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  actionsSetGithubActionsDefaultWorkflowPermissionsRepository$Response(params: ActionsSetGithubActionsDefaultWorkflowPermissionsRepository$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return actionsSetGithubActionsDefaultWorkflowPermissionsRepository(this.http, this.rootUrl, params, context);
  }

  /**
   * Set default workflow permissions for a repository.
   *
   * Sets the default workflow permissions granted to the `GITHUB_TOKEN` when running workflows in a repository, and sets if GitHub Actions
   * can submit approving pull request reviews.
   * For more information, see "[Setting the permissions of the GITHUB_TOKEN for your repository](https://docs.github.com/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository#setting-the-permissions-of-the-github_token-for-your-repository)."
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint. GitHub Apps must have the repository `administration` permission to use this API.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsSetGithubActionsDefaultWorkflowPermissionsRepository$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  actionsSetGithubActionsDefaultWorkflowPermissionsRepository(params: ActionsSetGithubActionsDefaultWorkflowPermissionsRepository$Params, context?: HttpContext): Observable<void> {
    return this.actionsSetGithubActionsDefaultWorkflowPermissionsRepository$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `actionsListSelfHostedRunnersForRepo()` */
  static readonly ActionsListSelfHostedRunnersForRepoPath = '/repos/{owner}/{repo}/actions/runners';

  /**
   * List self-hosted runners for a repository.
   *
   * Lists all self-hosted runners configured in a repository.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `administration` permission for repositories and the `organization_self_hosted_runners` permission for organizations.
   * Authenticated users must have admin access to repositories or organizations, or the `manage_runners:enterprise` scope for enterprises, to use these endpoints.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsListSelfHostedRunnersForRepo()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsListSelfHostedRunnersForRepo$Response(params: ActionsListSelfHostedRunnersForRepo$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'runners': Array<Runner>;
}>> {
    return actionsListSelfHostedRunnersForRepo(this.http, this.rootUrl, params, context);
  }

  /**
   * List self-hosted runners for a repository.
   *
   * Lists all self-hosted runners configured in a repository.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `administration` permission for repositories and the `organization_self_hosted_runners` permission for organizations.
   * Authenticated users must have admin access to repositories or organizations, or the `manage_runners:enterprise` scope for enterprises, to use these endpoints.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsListSelfHostedRunnersForRepo$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsListSelfHostedRunnersForRepo(params: ActionsListSelfHostedRunnersForRepo$Params, context?: HttpContext): Observable<{
'total_count': number;
'runners': Array<Runner>;
}> {
    return this.actionsListSelfHostedRunnersForRepo$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'total_count': number;
'runners': Array<Runner>;
}>): {
'total_count': number;
'runners': Array<Runner>;
} => r.body)
    );
  }

  /** Path part for operation `actionsListRunnerApplicationsForRepo()` */
  static readonly ActionsListRunnerApplicationsForRepoPath = '/repos/{owner}/{repo}/actions/runners/downloads';

  /**
   * List runner applications for a repository.
   *
   * Lists binaries for the runner application that you can download and run.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `administration` permission for repositories and the `organization_self_hosted_runners` permission for organizations.
   * Authenticated users must have admin access to repositories or organizations, or the `manage_runners:enterprise` scope for enterprises, to use these endpoints.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsListRunnerApplicationsForRepo()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsListRunnerApplicationsForRepo$Response(params: ActionsListRunnerApplicationsForRepo$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<RunnerApplication>>> {
    return actionsListRunnerApplicationsForRepo(this.http, this.rootUrl, params, context);
  }

  /**
   * List runner applications for a repository.
   *
   * Lists binaries for the runner application that you can download and run.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `administration` permission for repositories and the `organization_self_hosted_runners` permission for organizations.
   * Authenticated users must have admin access to repositories or organizations, or the `manage_runners:enterprise` scope for enterprises, to use these endpoints.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsListRunnerApplicationsForRepo$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsListRunnerApplicationsForRepo(params: ActionsListRunnerApplicationsForRepo$Params, context?: HttpContext): Observable<Array<RunnerApplication>> {
    return this.actionsListRunnerApplicationsForRepo$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<RunnerApplication>>): Array<RunnerApplication> => r.body)
    );
  }

  /** Path part for operation `actionsGenerateRunnerJitconfigForRepo()` */
  static readonly ActionsGenerateRunnerJitconfigForRepoPath = '/repos/{owner}/{repo}/actions/runners/generate-jitconfig';

  /**
   * Create configuration for a just-in-time runner for a repository.
   *
   * Generates a configuration that can be passed to the runner application at startup.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `administration` permission for repositories and the `organization_self_hosted_runners` permission for organizations.
   * Authenticated users must have admin access to repositories or organizations, or the `manage_runners:enterprise` scope for enterprises, to use these endpoints.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsGenerateRunnerJitconfigForRepo()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  actionsGenerateRunnerJitconfigForRepo$Response(params: ActionsGenerateRunnerJitconfigForRepo$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'runner': Runner;

/**
 * The base64 encoded runner configuration.
 */
'encoded_jit_config': string;
}>> {
    return actionsGenerateRunnerJitconfigForRepo(this.http, this.rootUrl, params, context);
  }

  /**
   * Create configuration for a just-in-time runner for a repository.
   *
   * Generates a configuration that can be passed to the runner application at startup.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `administration` permission for repositories and the `organization_self_hosted_runners` permission for organizations.
   * Authenticated users must have admin access to repositories or organizations, or the `manage_runners:enterprise` scope for enterprises, to use these endpoints.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsGenerateRunnerJitconfigForRepo$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  actionsGenerateRunnerJitconfigForRepo(params: ActionsGenerateRunnerJitconfigForRepo$Params, context?: HttpContext): Observable<{
'runner': Runner;

/**
 * The base64 encoded runner configuration.
 */
'encoded_jit_config': string;
}> {
    return this.actionsGenerateRunnerJitconfigForRepo$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'runner': Runner;

/**
 * The base64 encoded runner configuration.
 */
'encoded_jit_config': string;
}>): {
'runner': Runner;

/**
 * The base64 encoded runner configuration.
 */
'encoded_jit_config': string;
} => r.body)
    );
  }

  /** Path part for operation `actionsCreateRegistrationTokenForRepo()` */
  static readonly ActionsCreateRegistrationTokenForRepoPath = '/repos/{owner}/{repo}/actions/runners/registration-token';

  /**
   * Create a registration token for a repository.
   *
   * Returns a token that you can pass to the `config` script. The token
   * expires after one hour.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `administration` permission for repositories and the `organization_self_hosted_runners` permission for organizations.
   * Authenticated users must have admin access to repositories or organizations, or the `manage_runners:enterprise` scope for enterprises, to use these endpoints.
   *
   * Example using registration token: 
   *
   * Configure your self-hosted runner, replacing `TOKEN` with the registration token provided
   * by this endpoint.
   *
   * ```config.sh --url https://github.com/octo-org/octo-repo-artifacts --token TOKEN```
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsCreateRegistrationTokenForRepo()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsCreateRegistrationTokenForRepo$Response(params: ActionsCreateRegistrationTokenForRepo$Params, context?: HttpContext): Observable<StrictHttpResponse<AuthenticationToken>> {
    return actionsCreateRegistrationTokenForRepo(this.http, this.rootUrl, params, context);
  }

  /**
   * Create a registration token for a repository.
   *
   * Returns a token that you can pass to the `config` script. The token
   * expires after one hour.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `administration` permission for repositories and the `organization_self_hosted_runners` permission for organizations.
   * Authenticated users must have admin access to repositories or organizations, or the `manage_runners:enterprise` scope for enterprises, to use these endpoints.
   *
   * Example using registration token: 
   *
   * Configure your self-hosted runner, replacing `TOKEN` with the registration token provided
   * by this endpoint.
   *
   * ```config.sh --url https://github.com/octo-org/octo-repo-artifacts --token TOKEN```
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsCreateRegistrationTokenForRepo$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsCreateRegistrationTokenForRepo(params: ActionsCreateRegistrationTokenForRepo$Params, context?: HttpContext): Observable<AuthenticationToken> {
    return this.actionsCreateRegistrationTokenForRepo$Response(params, context).pipe(
      map((r: StrictHttpResponse<AuthenticationToken>): AuthenticationToken => r.body)
    );
  }

  /** Path part for operation `actionsCreateRemoveTokenForRepo()` */
  static readonly ActionsCreateRemoveTokenForRepoPath = '/repos/{owner}/{repo}/actions/runners/remove-token';

  /**
   * Create a remove token for a repository.
   *
   * Returns a token that you can pass to remove a self-hosted runner from
   * a repository. The token expires after one hour.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `administration` permission for repositories and the `organization_self_hosted_runners` permission for organizations.
   * Authenticated users must have admin access to repositories or organizations, or the `manage_runners:enterprise` scope for enterprises, to use these endpoints.
   *
   * Example using remove token:
   *
   * To remove your self-hosted runner from a repository, replace TOKEN with
   * the remove token provided by this endpoint.
   *
   * ```config.sh remove --token TOKEN```
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsCreateRemoveTokenForRepo()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsCreateRemoveTokenForRepo$Response(params: ActionsCreateRemoveTokenForRepo$Params, context?: HttpContext): Observable<StrictHttpResponse<AuthenticationToken>> {
    return actionsCreateRemoveTokenForRepo(this.http, this.rootUrl, params, context);
  }

  /**
   * Create a remove token for a repository.
   *
   * Returns a token that you can pass to remove a self-hosted runner from
   * a repository. The token expires after one hour.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `administration` permission for repositories and the `organization_self_hosted_runners` permission for organizations.
   * Authenticated users must have admin access to repositories or organizations, or the `manage_runners:enterprise` scope for enterprises, to use these endpoints.
   *
   * Example using remove token:
   *
   * To remove your self-hosted runner from a repository, replace TOKEN with
   * the remove token provided by this endpoint.
   *
   * ```config.sh remove --token TOKEN```
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsCreateRemoveTokenForRepo$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsCreateRemoveTokenForRepo(params: ActionsCreateRemoveTokenForRepo$Params, context?: HttpContext): Observable<AuthenticationToken> {
    return this.actionsCreateRemoveTokenForRepo$Response(params, context).pipe(
      map((r: StrictHttpResponse<AuthenticationToken>): AuthenticationToken => r.body)
    );
  }

  /** Path part for operation `actionsGetSelfHostedRunnerForRepo()` */
  static readonly ActionsGetSelfHostedRunnerForRepoPath = '/repos/{owner}/{repo}/actions/runners/{runner_id}';

  /**
   * Get a self-hosted runner for a repository.
   *
   * Gets a specific self-hosted runner configured in a repository.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `administration` permission for repositories and the `organization_self_hosted_runners` permission for organizations.
   * Authenticated users must have admin access to repositories or organizations, or the `manage_runners:enterprise` scope for enterprises, to use these endpoints.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsGetSelfHostedRunnerForRepo()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsGetSelfHostedRunnerForRepo$Response(params: ActionsGetSelfHostedRunnerForRepo$Params, context?: HttpContext): Observable<StrictHttpResponse<Runner>> {
    return actionsGetSelfHostedRunnerForRepo(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a self-hosted runner for a repository.
   *
   * Gets a specific self-hosted runner configured in a repository.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `administration` permission for repositories and the `organization_self_hosted_runners` permission for organizations.
   * Authenticated users must have admin access to repositories or organizations, or the `manage_runners:enterprise` scope for enterprises, to use these endpoints.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsGetSelfHostedRunnerForRepo$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsGetSelfHostedRunnerForRepo(params: ActionsGetSelfHostedRunnerForRepo$Params, context?: HttpContext): Observable<Runner> {
    return this.actionsGetSelfHostedRunnerForRepo$Response(params, context).pipe(
      map((r: StrictHttpResponse<Runner>): Runner => r.body)
    );
  }

  /** Path part for operation `actionsDeleteSelfHostedRunnerFromRepo()` */
  static readonly ActionsDeleteSelfHostedRunnerFromRepoPath = '/repos/{owner}/{repo}/actions/runners/{runner_id}';

  /**
   * Delete a self-hosted runner from a repository.
   *
   * Forces the removal of a self-hosted runner from a repository. You can use this endpoint to completely remove the runner when the machine you were using no longer exists.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `administration` permission for repositories and the `organization_self_hosted_runners` permission for organizations.
   * Authenticated users must have admin access to repositories or organizations, or the `manage_runners:enterprise` scope for enterprises, to use these endpoints.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsDeleteSelfHostedRunnerFromRepo()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsDeleteSelfHostedRunnerFromRepo$Response(params: ActionsDeleteSelfHostedRunnerFromRepo$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return actionsDeleteSelfHostedRunnerFromRepo(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete a self-hosted runner from a repository.
   *
   * Forces the removal of a self-hosted runner from a repository. You can use this endpoint to completely remove the runner when the machine you were using no longer exists.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `administration` permission for repositories and the `organization_self_hosted_runners` permission for organizations.
   * Authenticated users must have admin access to repositories or organizations, or the `manage_runners:enterprise` scope for enterprises, to use these endpoints.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsDeleteSelfHostedRunnerFromRepo$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsDeleteSelfHostedRunnerFromRepo(params: ActionsDeleteSelfHostedRunnerFromRepo$Params, context?: HttpContext): Observable<void> {
    return this.actionsDeleteSelfHostedRunnerFromRepo$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `actionsListLabelsForSelfHostedRunnerForRepo()` */
  static readonly ActionsListLabelsForSelfHostedRunnerForRepoPath = '/repos/{owner}/{repo}/actions/runners/{runner_id}/labels';

  /**
   * List labels for a self-hosted runner for a repository.
   *
   * Lists all labels for a self-hosted runner configured in a repository.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `administration` permission for repositories and the `organization_self_hosted_runners` permission for organizations.
   * Authenticated users must have admin access to repositories or organizations, or the `manage_runners:enterprise` scope for enterprises, to use these endpoints.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsListLabelsForSelfHostedRunnerForRepo()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsListLabelsForSelfHostedRunnerForRepo$Response(params: ActionsListLabelsForSelfHostedRunnerForRepo$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'labels': Array<RunnerLabel>;
}>> {
    return actionsListLabelsForSelfHostedRunnerForRepo(this.http, this.rootUrl, params, context);
  }

  /**
   * List labels for a self-hosted runner for a repository.
   *
   * Lists all labels for a self-hosted runner configured in a repository.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `administration` permission for repositories and the `organization_self_hosted_runners` permission for organizations.
   * Authenticated users must have admin access to repositories or organizations, or the `manage_runners:enterprise` scope for enterprises, to use these endpoints.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsListLabelsForSelfHostedRunnerForRepo$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsListLabelsForSelfHostedRunnerForRepo(params: ActionsListLabelsForSelfHostedRunnerForRepo$Params, context?: HttpContext): Observable<{
'total_count': number;
'labels': Array<RunnerLabel>;
}> {
    return this.actionsListLabelsForSelfHostedRunnerForRepo$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'total_count': number;
'labels': Array<RunnerLabel>;
}>): {
'total_count': number;
'labels': Array<RunnerLabel>;
} => r.body)
    );
  }

  /** Path part for operation `actionsSetCustomLabelsForSelfHostedRunnerForRepo()` */
  static readonly ActionsSetCustomLabelsForSelfHostedRunnerForRepoPath = '/repos/{owner}/{repo}/actions/runners/{runner_id}/labels';

  /**
   * Set custom labels for a self-hosted runner for a repository.
   *
   * Remove all previous custom labels and set the new custom labels for a specific
   * self-hosted runner configured in a repository.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `administration` permission for repositories and the `organization_self_hosted_runners` permission for organizations.
   * Authenticated users must have admin access to repositories or organizations, or the `manage_runners:enterprise` scope for enterprises, to use these endpoints.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsSetCustomLabelsForSelfHostedRunnerForRepo()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  actionsSetCustomLabelsForSelfHostedRunnerForRepo$Response(params: ActionsSetCustomLabelsForSelfHostedRunnerForRepo$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'labels': Array<RunnerLabel>;
}>> {
    return actionsSetCustomLabelsForSelfHostedRunnerForRepo(this.http, this.rootUrl, params, context);
  }

  /**
   * Set custom labels for a self-hosted runner for a repository.
   *
   * Remove all previous custom labels and set the new custom labels for a specific
   * self-hosted runner configured in a repository.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `administration` permission for repositories and the `organization_self_hosted_runners` permission for organizations.
   * Authenticated users must have admin access to repositories or organizations, or the `manage_runners:enterprise` scope for enterprises, to use these endpoints.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsSetCustomLabelsForSelfHostedRunnerForRepo$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  actionsSetCustomLabelsForSelfHostedRunnerForRepo(params: ActionsSetCustomLabelsForSelfHostedRunnerForRepo$Params, context?: HttpContext): Observable<{
'total_count': number;
'labels': Array<RunnerLabel>;
}> {
    return this.actionsSetCustomLabelsForSelfHostedRunnerForRepo$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'total_count': number;
'labels': Array<RunnerLabel>;
}>): {
'total_count': number;
'labels': Array<RunnerLabel>;
} => r.body)
    );
  }

  /** Path part for operation `actionsAddCustomLabelsToSelfHostedRunnerForRepo()` */
  static readonly ActionsAddCustomLabelsToSelfHostedRunnerForRepoPath = '/repos/{owner}/{repo}/actions/runners/{runner_id}/labels';

  /**
   * Add custom labels to a self-hosted runner for a repository.
   *
   * Add custom labels to a self-hosted runner configured in a repository.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `administration` permission for repositories and the `organization_self_hosted_runners` permission for organizations.
   * Authenticated users must have admin access to repositories or organizations, or the `manage_runners:enterprise` scope for enterprises, to use these endpoints.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsAddCustomLabelsToSelfHostedRunnerForRepo()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  actionsAddCustomLabelsToSelfHostedRunnerForRepo$Response(params: ActionsAddCustomLabelsToSelfHostedRunnerForRepo$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'labels': Array<RunnerLabel>;
}>> {
    return actionsAddCustomLabelsToSelfHostedRunnerForRepo(this.http, this.rootUrl, params, context);
  }

  /**
   * Add custom labels to a self-hosted runner for a repository.
   *
   * Add custom labels to a self-hosted runner configured in a repository.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `administration` permission for repositories and the `organization_self_hosted_runners` permission for organizations.
   * Authenticated users must have admin access to repositories or organizations, or the `manage_runners:enterprise` scope for enterprises, to use these endpoints.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsAddCustomLabelsToSelfHostedRunnerForRepo$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  actionsAddCustomLabelsToSelfHostedRunnerForRepo(params: ActionsAddCustomLabelsToSelfHostedRunnerForRepo$Params, context?: HttpContext): Observable<{
'total_count': number;
'labels': Array<RunnerLabel>;
}> {
    return this.actionsAddCustomLabelsToSelfHostedRunnerForRepo$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'total_count': number;
'labels': Array<RunnerLabel>;
}>): {
'total_count': number;
'labels': Array<RunnerLabel>;
} => r.body)
    );
  }

  /** Path part for operation `actionsRemoveAllCustomLabelsFromSelfHostedRunnerForRepo()` */
  static readonly ActionsRemoveAllCustomLabelsFromSelfHostedRunnerForRepoPath = '/repos/{owner}/{repo}/actions/runners/{runner_id}/labels';

  /**
   * Remove all custom labels from a self-hosted runner for a repository.
   *
   * Remove all custom labels from a self-hosted runner configured in a
   * repository. Returns the remaining read-only labels from the runner.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `administration` permission for repositories and the `organization_self_hosted_runners` permission for organizations.
   * Authenticated users must have admin access to repositories or organizations, or the `manage_runners:enterprise` scope for enterprises, to use these endpoints.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsRemoveAllCustomLabelsFromSelfHostedRunnerForRepo()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsRemoveAllCustomLabelsFromSelfHostedRunnerForRepo$Response(params: ActionsRemoveAllCustomLabelsFromSelfHostedRunnerForRepo$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'labels': Array<RunnerLabel>;
}>> {
    return actionsRemoveAllCustomLabelsFromSelfHostedRunnerForRepo(this.http, this.rootUrl, params, context);
  }

  /**
   * Remove all custom labels from a self-hosted runner for a repository.
   *
   * Remove all custom labels from a self-hosted runner configured in a
   * repository. Returns the remaining read-only labels from the runner.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `administration` permission for repositories and the `organization_self_hosted_runners` permission for organizations.
   * Authenticated users must have admin access to repositories or organizations, or the `manage_runners:enterprise` scope for enterprises, to use these endpoints.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsRemoveAllCustomLabelsFromSelfHostedRunnerForRepo$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsRemoveAllCustomLabelsFromSelfHostedRunnerForRepo(params: ActionsRemoveAllCustomLabelsFromSelfHostedRunnerForRepo$Params, context?: HttpContext): Observable<{
'total_count': number;
'labels': Array<RunnerLabel>;
}> {
    return this.actionsRemoveAllCustomLabelsFromSelfHostedRunnerForRepo$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'total_count': number;
'labels': Array<RunnerLabel>;
}>): {
'total_count': number;
'labels': Array<RunnerLabel>;
} => r.body)
    );
  }

  /** Path part for operation `actionsRemoveCustomLabelFromSelfHostedRunnerForRepo()` */
  static readonly ActionsRemoveCustomLabelFromSelfHostedRunnerForRepoPath = '/repos/{owner}/{repo}/actions/runners/{runner_id}/labels/{name}';

  /**
   * Remove a custom label from a self-hosted runner for a repository.
   *
   * Remove a custom label from a self-hosted runner configured
   * in a repository. Returns the remaining labels from the runner.
   *
   * This endpoint returns a `404 Not Found` status if the custom label is not
   * present on the runner.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `administration` permission for repositories and the `organization_self_hosted_runners` permission for organizations.
   * Authenticated users must have admin access to repositories or organizations, or the `manage_runners:enterprise` scope for enterprises, to use these endpoints.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsRemoveCustomLabelFromSelfHostedRunnerForRepo()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsRemoveCustomLabelFromSelfHostedRunnerForRepo$Response(params: ActionsRemoveCustomLabelFromSelfHostedRunnerForRepo$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'labels': Array<RunnerLabel>;
}>> {
    return actionsRemoveCustomLabelFromSelfHostedRunnerForRepo(this.http, this.rootUrl, params, context);
  }

  /**
   * Remove a custom label from a self-hosted runner for a repository.
   *
   * Remove a custom label from a self-hosted runner configured
   * in a repository. Returns the remaining labels from the runner.
   *
   * This endpoint returns a `404 Not Found` status if the custom label is not
   * present on the runner.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `administration` permission for repositories and the `organization_self_hosted_runners` permission for organizations.
   * Authenticated users must have admin access to repositories or organizations, or the `manage_runners:enterprise` scope for enterprises, to use these endpoints.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsRemoveCustomLabelFromSelfHostedRunnerForRepo$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsRemoveCustomLabelFromSelfHostedRunnerForRepo(params: ActionsRemoveCustomLabelFromSelfHostedRunnerForRepo$Params, context?: HttpContext): Observable<{
'total_count': number;
'labels': Array<RunnerLabel>;
}> {
    return this.actionsRemoveCustomLabelFromSelfHostedRunnerForRepo$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'total_count': number;
'labels': Array<RunnerLabel>;
}>): {
'total_count': number;
'labels': Array<RunnerLabel>;
} => r.body)
    );
  }

  /** Path part for operation `actionsListWorkflowRunsForRepo()` */
  static readonly ActionsListWorkflowRunsForRepoPath = '/repos/{owner}/{repo}/actions/runs';

  /**
   * List workflow runs for a repository.
   *
   * Lists all workflow runs for a repository. You can use parameters to narrow the list of results. For more information about using parameters, see [Parameters](https://docs.github.com/rest/overview/resources-in-the-rest-api#parameters).
   *
   * Anyone with read access to the repository can use this endpoint. If the repository is private you must use an access token with the `repo` scope. GitHub Apps must have the `actions:read` permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsListWorkflowRunsForRepo()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsListWorkflowRunsForRepo$Response(params: ActionsListWorkflowRunsForRepo$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'workflow_runs': Array<WorkflowRun>;
}>> {
    return actionsListWorkflowRunsForRepo(this.http, this.rootUrl, params, context);
  }

  /**
   * List workflow runs for a repository.
   *
   * Lists all workflow runs for a repository. You can use parameters to narrow the list of results. For more information about using parameters, see [Parameters](https://docs.github.com/rest/overview/resources-in-the-rest-api#parameters).
   *
   * Anyone with read access to the repository can use this endpoint. If the repository is private you must use an access token with the `repo` scope. GitHub Apps must have the `actions:read` permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsListWorkflowRunsForRepo$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsListWorkflowRunsForRepo(params: ActionsListWorkflowRunsForRepo$Params, context?: HttpContext): Observable<{
'total_count': number;
'workflow_runs': Array<WorkflowRun>;
}> {
    return this.actionsListWorkflowRunsForRepo$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'total_count': number;
'workflow_runs': Array<WorkflowRun>;
}>): {
'total_count': number;
'workflow_runs': Array<WorkflowRun>;
} => r.body)
    );
  }

  /** Path part for operation `actionsGetWorkflowRun()` */
  static readonly ActionsGetWorkflowRunPath = '/repos/{owner}/{repo}/actions/runs/{run_id}';

  /**
   * Get a workflow run.
   *
   * Gets a specific workflow run. Anyone with read access to the repository can use this endpoint. If the repository is private you must use an access token with the `repo` scope. GitHub Apps must have the `actions:read` permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsGetWorkflowRun()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsGetWorkflowRun$Response(params: ActionsGetWorkflowRun$Params, context?: HttpContext): Observable<StrictHttpResponse<WorkflowRun>> {
    return actionsGetWorkflowRun(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a workflow run.
   *
   * Gets a specific workflow run. Anyone with read access to the repository can use this endpoint. If the repository is private you must use an access token with the `repo` scope. GitHub Apps must have the `actions:read` permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsGetWorkflowRun$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsGetWorkflowRun(params: ActionsGetWorkflowRun$Params, context?: HttpContext): Observable<WorkflowRun> {
    return this.actionsGetWorkflowRun$Response(params, context).pipe(
      map((r: StrictHttpResponse<WorkflowRun>): WorkflowRun => r.body)
    );
  }

  /** Path part for operation `actionsDeleteWorkflowRun()` */
  static readonly ActionsDeleteWorkflowRunPath = '/repos/{owner}/{repo}/actions/runs/{run_id}';

  /**
   * Delete a workflow run.
   *
   * Delete a specific workflow run. Anyone with write access to the repository can use this endpoint. If the repository is
   * private you must use an access token with the `repo` scope. GitHub Apps must have the `actions:write` permission to use
   * this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsDeleteWorkflowRun()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsDeleteWorkflowRun$Response(params: ActionsDeleteWorkflowRun$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return actionsDeleteWorkflowRun(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete a workflow run.
   *
   * Delete a specific workflow run. Anyone with write access to the repository can use this endpoint. If the repository is
   * private you must use an access token with the `repo` scope. GitHub Apps must have the `actions:write` permission to use
   * this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsDeleteWorkflowRun$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsDeleteWorkflowRun(params: ActionsDeleteWorkflowRun$Params, context?: HttpContext): Observable<void> {
    return this.actionsDeleteWorkflowRun$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `actionsGetReviewsForRun()` */
  static readonly ActionsGetReviewsForRunPath = '/repos/{owner}/{repo}/actions/runs/{run_id}/approvals';

  /**
   * Get the review history for a workflow run.
   *
   * Anyone with read access to the repository can use this endpoint. If the repository is private, you must use an access token with the `repo` scope. GitHub Apps must have the `actions:read` permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsGetReviewsForRun()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsGetReviewsForRun$Response(params: ActionsGetReviewsForRun$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<EnvironmentApprovals>>> {
    return actionsGetReviewsForRun(this.http, this.rootUrl, params, context);
  }

  /**
   * Get the review history for a workflow run.
   *
   * Anyone with read access to the repository can use this endpoint. If the repository is private, you must use an access token with the `repo` scope. GitHub Apps must have the `actions:read` permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsGetReviewsForRun$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsGetReviewsForRun(params: ActionsGetReviewsForRun$Params, context?: HttpContext): Observable<Array<EnvironmentApprovals>> {
    return this.actionsGetReviewsForRun$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<EnvironmentApprovals>>): Array<EnvironmentApprovals> => r.body)
    );
  }

  /** Path part for operation `actionsApproveWorkflowRun()` */
  static readonly ActionsApproveWorkflowRunPath = '/repos/{owner}/{repo}/actions/runs/{run_id}/approve';

  /**
   * Approve a workflow run for a fork pull request.
   *
   * Approves a workflow run for a pull request from a public fork of a first time contributor. For more information, see ["Approving workflow runs from public forks](https://docs.github.com/actions/managing-workflow-runs/approving-workflow-runs-from-public-forks)."
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint. GitHub Apps must have the `actions:write` permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsApproveWorkflowRun()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsApproveWorkflowRun$Response(params: ActionsApproveWorkflowRun$Params, context?: HttpContext): Observable<StrictHttpResponse<EmptyObject>> {
    return actionsApproveWorkflowRun(this.http, this.rootUrl, params, context);
  }

  /**
   * Approve a workflow run for a fork pull request.
   *
   * Approves a workflow run for a pull request from a public fork of a first time contributor. For more information, see ["Approving workflow runs from public forks](https://docs.github.com/actions/managing-workflow-runs/approving-workflow-runs-from-public-forks)."
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint. GitHub Apps must have the `actions:write` permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsApproveWorkflowRun$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsApproveWorkflowRun(params: ActionsApproveWorkflowRun$Params, context?: HttpContext): Observable<EmptyObject> {
    return this.actionsApproveWorkflowRun$Response(params, context).pipe(
      map((r: StrictHttpResponse<EmptyObject>): EmptyObject => r.body)
    );
  }

  /** Path part for operation `actionsListWorkflowRunArtifacts()` */
  static readonly ActionsListWorkflowRunArtifactsPath = '/repos/{owner}/{repo}/actions/runs/{run_id}/artifacts';

  /**
   * List workflow run artifacts.
   *
   * Lists artifacts for a workflow run. Anyone with read access to the repository can use this endpoint. If the repository is private you must use an access token with the `repo` scope. GitHub Apps must have the `actions:read` permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsListWorkflowRunArtifacts()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsListWorkflowRunArtifacts$Response(params: ActionsListWorkflowRunArtifacts$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'artifacts': Array<Artifact>;
}>> {
    return actionsListWorkflowRunArtifacts(this.http, this.rootUrl, params, context);
  }

  /**
   * List workflow run artifacts.
   *
   * Lists artifacts for a workflow run. Anyone with read access to the repository can use this endpoint. If the repository is private you must use an access token with the `repo` scope. GitHub Apps must have the `actions:read` permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsListWorkflowRunArtifacts$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsListWorkflowRunArtifacts(params: ActionsListWorkflowRunArtifacts$Params, context?: HttpContext): Observable<{
'total_count': number;
'artifacts': Array<Artifact>;
}> {
    return this.actionsListWorkflowRunArtifacts$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'total_count': number;
'artifacts': Array<Artifact>;
}>): {
'total_count': number;
'artifacts': Array<Artifact>;
} => r.body)
    );
  }

  /** Path part for operation `actionsGetWorkflowRunAttempt()` */
  static readonly ActionsGetWorkflowRunAttemptPath = '/repos/{owner}/{repo}/actions/runs/{run_id}/attempts/{attempt_number}';

  /**
   * Get a workflow run attempt.
   *
   * Gets a specific workflow run attempt. Anyone with read access to the repository
   * can use this endpoint. If the repository is private you must use an access token
   * with the `repo` scope. GitHub Apps must have the `actions:read` permission to
   * use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsGetWorkflowRunAttempt()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsGetWorkflowRunAttempt$Response(params: ActionsGetWorkflowRunAttempt$Params, context?: HttpContext): Observable<StrictHttpResponse<WorkflowRun>> {
    return actionsGetWorkflowRunAttempt(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a workflow run attempt.
   *
   * Gets a specific workflow run attempt. Anyone with read access to the repository
   * can use this endpoint. If the repository is private you must use an access token
   * with the `repo` scope. GitHub Apps must have the `actions:read` permission to
   * use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsGetWorkflowRunAttempt$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsGetWorkflowRunAttempt(params: ActionsGetWorkflowRunAttempt$Params, context?: HttpContext): Observable<WorkflowRun> {
    return this.actionsGetWorkflowRunAttempt$Response(params, context).pipe(
      map((r: StrictHttpResponse<WorkflowRun>): WorkflowRun => r.body)
    );
  }

  /** Path part for operation `actionsListJobsForWorkflowRunAttempt()` */
  static readonly ActionsListJobsForWorkflowRunAttemptPath = '/repos/{owner}/{repo}/actions/runs/{run_id}/attempts/{attempt_number}/jobs';

  /**
   * List jobs for a workflow run attempt.
   *
   * Lists jobs for a specific workflow run attempt. Anyone with read access to the repository can use this endpoint. If the repository is private you must use an access token with the `repo` scope. GitHub Apps must have the `actions:read` permission to use this endpoint. You can use parameters to narrow the list of results. For more information about using parameters, see [Parameters](https://docs.github.com/rest/overview/resources-in-the-rest-api#parameters).
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsListJobsForWorkflowRunAttempt()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsListJobsForWorkflowRunAttempt$Response(params: ActionsListJobsForWorkflowRunAttempt$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'jobs': Array<Job>;
}>> {
    return actionsListJobsForWorkflowRunAttempt(this.http, this.rootUrl, params, context);
  }

  /**
   * List jobs for a workflow run attempt.
   *
   * Lists jobs for a specific workflow run attempt. Anyone with read access to the repository can use this endpoint. If the repository is private you must use an access token with the `repo` scope. GitHub Apps must have the `actions:read` permission to use this endpoint. You can use parameters to narrow the list of results. For more information about using parameters, see [Parameters](https://docs.github.com/rest/overview/resources-in-the-rest-api#parameters).
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsListJobsForWorkflowRunAttempt$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsListJobsForWorkflowRunAttempt(params: ActionsListJobsForWorkflowRunAttempt$Params, context?: HttpContext): Observable<{
'total_count': number;
'jobs': Array<Job>;
}> {
    return this.actionsListJobsForWorkflowRunAttempt$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'total_count': number;
'jobs': Array<Job>;
}>): {
'total_count': number;
'jobs': Array<Job>;
} => r.body)
    );
  }

  /** Path part for operation `actionsDownloadWorkflowRunAttemptLogs()` */
  static readonly ActionsDownloadWorkflowRunAttemptLogsPath = '/repos/{owner}/{repo}/actions/runs/{run_id}/attempts/{attempt_number}/logs';

  /**
   * Download workflow run attempt logs.
   *
   * Gets a redirect URL to download an archive of log files for a specific workflow run attempt. This link expires after
   * 1 minute. Look for `Location:` in the response header to find the URL for the download. Anyone with read access to
   * the repository can use this endpoint. If the repository is private you must use an access token with the `repo` scope.
   * GitHub Apps must have the `actions:read` permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsDownloadWorkflowRunAttemptLogs()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsDownloadWorkflowRunAttemptLogs$Response(params: ActionsDownloadWorkflowRunAttemptLogs$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return actionsDownloadWorkflowRunAttemptLogs(this.http, this.rootUrl, params, context);
  }

  /**
   * Download workflow run attempt logs.
   *
   * Gets a redirect URL to download an archive of log files for a specific workflow run attempt. This link expires after
   * 1 minute. Look for `Location:` in the response header to find the URL for the download. Anyone with read access to
   * the repository can use this endpoint. If the repository is private you must use an access token with the `repo` scope.
   * GitHub Apps must have the `actions:read` permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsDownloadWorkflowRunAttemptLogs$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsDownloadWorkflowRunAttemptLogs(params: ActionsDownloadWorkflowRunAttemptLogs$Params, context?: HttpContext): Observable<void> {
    return this.actionsDownloadWorkflowRunAttemptLogs$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `actionsCancelWorkflowRun()` */
  static readonly ActionsCancelWorkflowRunPath = '/repos/{owner}/{repo}/actions/runs/{run_id}/cancel';

  /**
   * Cancel a workflow run.
   *
   * Cancels a workflow run using its `id`.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `actions:write` permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsCancelWorkflowRun()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsCancelWorkflowRun$Response(params: ActionsCancelWorkflowRun$Params, context?: HttpContext): Observable<StrictHttpResponse<EmptyObject>> {
    return actionsCancelWorkflowRun(this.http, this.rootUrl, params, context);
  }

  /**
   * Cancel a workflow run.
   *
   * Cancels a workflow run using its `id`.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `actions:write` permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsCancelWorkflowRun$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsCancelWorkflowRun(params: ActionsCancelWorkflowRun$Params, context?: HttpContext): Observable<EmptyObject> {
    return this.actionsCancelWorkflowRun$Response(params, context).pipe(
      map((r: StrictHttpResponse<EmptyObject>): EmptyObject => r.body)
    );
  }

  /** Path part for operation `actionsReviewCustomGatesForRun()` */
  static readonly ActionsReviewCustomGatesForRunPath = '/repos/{owner}/{repo}/actions/runs/{run_id}/deployment_protection_rule';

  /**
   * Review custom deployment protection rules for a workflow run.
   *
   * Approve or reject custom deployment protection rules provided by a GitHub App for a workflow run. For more information, see "[Using environments for deployment](https://docs.github.com/actions/deployment/targeting-different-environments/using-environments-for-deployment)."
   *
   * **Note:** GitHub Apps can only review their own custom deployment protection rules.
   * To approve or reject pending deployments that are waiting for review from a specific person or team, see [`POST /repos/{owner}/{repo}/actions/runs/{run_id}/pending_deployments`](/rest/actions/workflow-runs#review-pending-deployments-for-a-workflow-run).
   *
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have read and write permission for **Deployments** to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsReviewCustomGatesForRun()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  actionsReviewCustomGatesForRun$Response(params: ActionsReviewCustomGatesForRun$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return actionsReviewCustomGatesForRun(this.http, this.rootUrl, params, context);
  }

  /**
   * Review custom deployment protection rules for a workflow run.
   *
   * Approve or reject custom deployment protection rules provided by a GitHub App for a workflow run. For more information, see "[Using environments for deployment](https://docs.github.com/actions/deployment/targeting-different-environments/using-environments-for-deployment)."
   *
   * **Note:** GitHub Apps can only review their own custom deployment protection rules.
   * To approve or reject pending deployments that are waiting for review from a specific person or team, see [`POST /repos/{owner}/{repo}/actions/runs/{run_id}/pending_deployments`](/rest/actions/workflow-runs#review-pending-deployments-for-a-workflow-run).
   *
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have read and write permission for **Deployments** to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsReviewCustomGatesForRun$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  actionsReviewCustomGatesForRun(params: ActionsReviewCustomGatesForRun$Params, context?: HttpContext): Observable<void> {
    return this.actionsReviewCustomGatesForRun$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `actionsListJobsForWorkflowRun()` */
  static readonly ActionsListJobsForWorkflowRunPath = '/repos/{owner}/{repo}/actions/runs/{run_id}/jobs';

  /**
   * List jobs for a workflow run.
   *
   * Lists jobs for a workflow run. Anyone with read access to the repository can use this endpoint. If the repository is private you must use an access token with the `repo` scope. GitHub Apps must have the `actions:read` permission to use this endpoint. You can use parameters to narrow the list of results. For more information about using parameters, see [Parameters](https://docs.github.com/rest/overview/resources-in-the-rest-api#parameters).
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsListJobsForWorkflowRun()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsListJobsForWorkflowRun$Response(params: ActionsListJobsForWorkflowRun$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'jobs': Array<Job>;
}>> {
    return actionsListJobsForWorkflowRun(this.http, this.rootUrl, params, context);
  }

  /**
   * List jobs for a workflow run.
   *
   * Lists jobs for a workflow run. Anyone with read access to the repository can use this endpoint. If the repository is private you must use an access token with the `repo` scope. GitHub Apps must have the `actions:read` permission to use this endpoint. You can use parameters to narrow the list of results. For more information about using parameters, see [Parameters](https://docs.github.com/rest/overview/resources-in-the-rest-api#parameters).
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsListJobsForWorkflowRun$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsListJobsForWorkflowRun(params: ActionsListJobsForWorkflowRun$Params, context?: HttpContext): Observable<{
'total_count': number;
'jobs': Array<Job>;
}> {
    return this.actionsListJobsForWorkflowRun$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'total_count': number;
'jobs': Array<Job>;
}>): {
'total_count': number;
'jobs': Array<Job>;
} => r.body)
    );
  }

  /** Path part for operation `actionsDownloadWorkflowRunLogs()` */
  static readonly ActionsDownloadWorkflowRunLogsPath = '/repos/{owner}/{repo}/actions/runs/{run_id}/logs';

  /**
   * Download workflow run logs.
   *
   * Gets a redirect URL to download an archive of log files for a workflow run. This link expires after 1 minute. Look for
   * `Location:` in the response header to find the URL for the download. Anyone with read access to the repository can use
   * this endpoint. If the repository is private you must use an access token with the `repo` scope. GitHub Apps must have
   * the `actions:read` permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsDownloadWorkflowRunLogs()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsDownloadWorkflowRunLogs$Response(params: ActionsDownloadWorkflowRunLogs$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return actionsDownloadWorkflowRunLogs(this.http, this.rootUrl, params, context);
  }

  /**
   * Download workflow run logs.
   *
   * Gets a redirect URL to download an archive of log files for a workflow run. This link expires after 1 minute. Look for
   * `Location:` in the response header to find the URL for the download. Anyone with read access to the repository can use
   * this endpoint. If the repository is private you must use an access token with the `repo` scope. GitHub Apps must have
   * the `actions:read` permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsDownloadWorkflowRunLogs$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsDownloadWorkflowRunLogs(params: ActionsDownloadWorkflowRunLogs$Params, context?: HttpContext): Observable<void> {
    return this.actionsDownloadWorkflowRunLogs$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `actionsDeleteWorkflowRunLogs()` */
  static readonly ActionsDeleteWorkflowRunLogsPath = '/repos/{owner}/{repo}/actions/runs/{run_id}/logs';

  /**
   * Delete workflow run logs.
   *
   * Deletes all logs for a workflow run. You must authenticate using an access token with the `repo` scope to use this endpoint. GitHub Apps must have the `actions:write` permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsDeleteWorkflowRunLogs()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsDeleteWorkflowRunLogs$Response(params: ActionsDeleteWorkflowRunLogs$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return actionsDeleteWorkflowRunLogs(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete workflow run logs.
   *
   * Deletes all logs for a workflow run. You must authenticate using an access token with the `repo` scope to use this endpoint. GitHub Apps must have the `actions:write` permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsDeleteWorkflowRunLogs$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsDeleteWorkflowRunLogs(params: ActionsDeleteWorkflowRunLogs$Params, context?: HttpContext): Observable<void> {
    return this.actionsDeleteWorkflowRunLogs$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `actionsGetPendingDeploymentsForRun()` */
  static readonly ActionsGetPendingDeploymentsForRunPath = '/repos/{owner}/{repo}/actions/runs/{run_id}/pending_deployments';

  /**
   * Get pending deployments for a workflow run.
   *
   * Get all deployment environments for a workflow run that are waiting for protection rules to pass.
   *
   * Anyone with read access to the repository can use this endpoint. If the repository is private, you must use an access token with the `repo` scope. GitHub Apps must have the `actions:read` permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsGetPendingDeploymentsForRun()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsGetPendingDeploymentsForRun$Response(params: ActionsGetPendingDeploymentsForRun$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<PendingDeployment>>> {
    return actionsGetPendingDeploymentsForRun(this.http, this.rootUrl, params, context);
  }

  /**
   * Get pending deployments for a workflow run.
   *
   * Get all deployment environments for a workflow run that are waiting for protection rules to pass.
   *
   * Anyone with read access to the repository can use this endpoint. If the repository is private, you must use an access token with the `repo` scope. GitHub Apps must have the `actions:read` permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsGetPendingDeploymentsForRun$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsGetPendingDeploymentsForRun(params: ActionsGetPendingDeploymentsForRun$Params, context?: HttpContext): Observable<Array<PendingDeployment>> {
    return this.actionsGetPendingDeploymentsForRun$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<PendingDeployment>>): Array<PendingDeployment> => r.body)
    );
  }

  /** Path part for operation `actionsReviewPendingDeploymentsForRun()` */
  static readonly ActionsReviewPendingDeploymentsForRunPath = '/repos/{owner}/{repo}/actions/runs/{run_id}/pending_deployments';

  /**
   * Review pending deployments for a workflow run.
   *
   * Approve or reject pending deployments that are waiting on approval by a required reviewer.
   *
   * Required reviewers with read access to the repository contents and deployments can use this endpoint. Required reviewers must authenticate using an access token with the `repo` scope to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsReviewPendingDeploymentsForRun()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  actionsReviewPendingDeploymentsForRun$Response(params: ActionsReviewPendingDeploymentsForRun$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Deployment>>> {
    return actionsReviewPendingDeploymentsForRun(this.http, this.rootUrl, params, context);
  }

  /**
   * Review pending deployments for a workflow run.
   *
   * Approve or reject pending deployments that are waiting on approval by a required reviewer.
   *
   * Required reviewers with read access to the repository contents and deployments can use this endpoint. Required reviewers must authenticate using an access token with the `repo` scope to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsReviewPendingDeploymentsForRun$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  actionsReviewPendingDeploymentsForRun(params: ActionsReviewPendingDeploymentsForRun$Params, context?: HttpContext): Observable<Array<Deployment>> {
    return this.actionsReviewPendingDeploymentsForRun$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Deployment>>): Array<Deployment> => r.body)
    );
  }

  /** Path part for operation `actionsReRunWorkflow()` */
  static readonly ActionsReRunWorkflowPath = '/repos/{owner}/{repo}/actions/runs/{run_id}/rerun';

  /**
   * Re-run a workflow.
   *
   * Re-runs your workflow run using its `id`. You must authenticate using an access token with the `repo` scope to use this endpoint. GitHub Apps must have the `actions:write` permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsReRunWorkflow()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  actionsReRunWorkflow$Response(params: ActionsReRunWorkflow$Params, context?: HttpContext): Observable<StrictHttpResponse<EmptyObject>> {
    return actionsReRunWorkflow(this.http, this.rootUrl, params, context);
  }

  /**
   * Re-run a workflow.
   *
   * Re-runs your workflow run using its `id`. You must authenticate using an access token with the `repo` scope to use this endpoint. GitHub Apps must have the `actions:write` permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsReRunWorkflow$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  actionsReRunWorkflow(params: ActionsReRunWorkflow$Params, context?: HttpContext): Observable<EmptyObject> {
    return this.actionsReRunWorkflow$Response(params, context).pipe(
      map((r: StrictHttpResponse<EmptyObject>): EmptyObject => r.body)
    );
  }

  /** Path part for operation `actionsReRunWorkflowFailedJobs()` */
  static readonly ActionsReRunWorkflowFailedJobsPath = '/repos/{owner}/{repo}/actions/runs/{run_id}/rerun-failed-jobs';

  /**
   * Re-run failed jobs from a workflow run.
   *
   * Re-run all of the failed jobs and their dependent jobs in a workflow run using the `id` of the workflow run. You must authenticate using an access token with the `repo` scope to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsReRunWorkflowFailedJobs()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  actionsReRunWorkflowFailedJobs$Response(params: ActionsReRunWorkflowFailedJobs$Params, context?: HttpContext): Observable<StrictHttpResponse<EmptyObject>> {
    return actionsReRunWorkflowFailedJobs(this.http, this.rootUrl, params, context);
  }

  /**
   * Re-run failed jobs from a workflow run.
   *
   * Re-run all of the failed jobs and their dependent jobs in a workflow run using the `id` of the workflow run. You must authenticate using an access token with the `repo` scope to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsReRunWorkflowFailedJobs$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  actionsReRunWorkflowFailedJobs(params: ActionsReRunWorkflowFailedJobs$Params, context?: HttpContext): Observable<EmptyObject> {
    return this.actionsReRunWorkflowFailedJobs$Response(params, context).pipe(
      map((r: StrictHttpResponse<EmptyObject>): EmptyObject => r.body)
    );
  }

  /** Path part for operation `actionsGetWorkflowRunUsage()` */
  static readonly ActionsGetWorkflowRunUsagePath = '/repos/{owner}/{repo}/actions/runs/{run_id}/timing';

  /**
   * Get workflow run usage.
   *
   * Gets the number of billable minutes and total run time for a specific workflow run. Billable minutes only apply to workflows in private repositories that use GitHub-hosted runners. Usage is listed for each GitHub-hosted runner operating system in milliseconds. Any job re-runs are also included in the usage. The usage does not include the multiplier for macOS and Windows runners and is not rounded up to the nearest whole minute. For more information, see "[Managing billing for GitHub Actions](https://docs.github.com/github/setting-up-and-managing-billing-and-payments-on-github/managing-billing-for-github-actions)".
   *
   * Anyone with read access to the repository can use this endpoint. If the repository is private you must use an access token with the `repo` scope. GitHub Apps must have the `actions:read` permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsGetWorkflowRunUsage()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsGetWorkflowRunUsage$Response(params: ActionsGetWorkflowRunUsage$Params, context?: HttpContext): Observable<StrictHttpResponse<WorkflowRunUsage>> {
    return actionsGetWorkflowRunUsage(this.http, this.rootUrl, params, context);
  }

  /**
   * Get workflow run usage.
   *
   * Gets the number of billable minutes and total run time for a specific workflow run. Billable minutes only apply to workflows in private repositories that use GitHub-hosted runners. Usage is listed for each GitHub-hosted runner operating system in milliseconds. Any job re-runs are also included in the usage. The usage does not include the multiplier for macOS and Windows runners and is not rounded up to the nearest whole minute. For more information, see "[Managing billing for GitHub Actions](https://docs.github.com/github/setting-up-and-managing-billing-and-payments-on-github/managing-billing-for-github-actions)".
   *
   * Anyone with read access to the repository can use this endpoint. If the repository is private you must use an access token with the `repo` scope. GitHub Apps must have the `actions:read` permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsGetWorkflowRunUsage$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsGetWorkflowRunUsage(params: ActionsGetWorkflowRunUsage$Params, context?: HttpContext): Observable<WorkflowRunUsage> {
    return this.actionsGetWorkflowRunUsage$Response(params, context).pipe(
      map((r: StrictHttpResponse<WorkflowRunUsage>): WorkflowRunUsage => r.body)
    );
  }

  /** Path part for operation `actionsListRepoSecrets()` */
  static readonly ActionsListRepoSecretsPath = '/repos/{owner}/{repo}/actions/secrets';

  /**
   * List repository secrets.
   *
   * Lists all secrets available in a repository without revealing their encrypted
   * values.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * GitHub Apps must have the `secrets` repository permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read secrets.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsListRepoSecrets()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsListRepoSecrets$Response(params: ActionsListRepoSecrets$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'secrets': Array<ActionsSecret>;
}>> {
    return actionsListRepoSecrets(this.http, this.rootUrl, params, context);
  }

  /**
   * List repository secrets.
   *
   * Lists all secrets available in a repository without revealing their encrypted
   * values.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * GitHub Apps must have the `secrets` repository permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read secrets.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsListRepoSecrets$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsListRepoSecrets(params: ActionsListRepoSecrets$Params, context?: HttpContext): Observable<{
'total_count': number;
'secrets': Array<ActionsSecret>;
}> {
    return this.actionsListRepoSecrets$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'total_count': number;
'secrets': Array<ActionsSecret>;
}>): {
'total_count': number;
'secrets': Array<ActionsSecret>;
} => r.body)
    );
  }

  /** Path part for operation `actionsGetRepoPublicKey()` */
  static readonly ActionsGetRepoPublicKeyPath = '/repos/{owner}/{repo}/actions/secrets/public-key';

  /**
   * Get a repository public key.
   *
   * Gets your public key, which you need to encrypt secrets. You need to
   * encrypt a secret before you can create or update secrets.
   *
   * Anyone with read access to the repository can use this endpoint.
   * If the repository is private you must use an access token with the `repo` scope.
   * GitHub Apps must have the `secrets` repository permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read secrets.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsGetRepoPublicKey()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsGetRepoPublicKey$Response(params: ActionsGetRepoPublicKey$Params, context?: HttpContext): Observable<StrictHttpResponse<ActionsPublicKey>> {
    return actionsGetRepoPublicKey(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a repository public key.
   *
   * Gets your public key, which you need to encrypt secrets. You need to
   * encrypt a secret before you can create or update secrets.
   *
   * Anyone with read access to the repository can use this endpoint.
   * If the repository is private you must use an access token with the `repo` scope.
   * GitHub Apps must have the `secrets` repository permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read secrets.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsGetRepoPublicKey$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsGetRepoPublicKey(params: ActionsGetRepoPublicKey$Params, context?: HttpContext): Observable<ActionsPublicKey> {
    return this.actionsGetRepoPublicKey$Response(params, context).pipe(
      map((r: StrictHttpResponse<ActionsPublicKey>): ActionsPublicKey => r.body)
    );
  }

  /** Path part for operation `actionsGetRepoSecret()` */
  static readonly ActionsGetRepoSecretPath = '/repos/{owner}/{repo}/actions/secrets/{secret_name}';

  /**
   * Get a repository secret.
   *
   * Gets a single repository secret without revealing its encrypted value.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * GitHub Apps must have the `secrets` repository permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read secrets.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsGetRepoSecret()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsGetRepoSecret$Response(params: ActionsGetRepoSecret$Params, context?: HttpContext): Observable<StrictHttpResponse<ActionsSecret>> {
    return actionsGetRepoSecret(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a repository secret.
   *
   * Gets a single repository secret without revealing its encrypted value.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * GitHub Apps must have the `secrets` repository permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read secrets.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsGetRepoSecret$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsGetRepoSecret(params: ActionsGetRepoSecret$Params, context?: HttpContext): Observable<ActionsSecret> {
    return this.actionsGetRepoSecret$Response(params, context).pipe(
      map((r: StrictHttpResponse<ActionsSecret>): ActionsSecret => r.body)
    );
  }

  /** Path part for operation `actionsCreateOrUpdateRepoSecret()` */
  static readonly ActionsCreateOrUpdateRepoSecretPath = '/repos/{owner}/{repo}/actions/secrets/{secret_name}';

  /**
   * Create or update a repository secret.
   *
   * Creates or updates a repository secret with an encrypted value. Encrypt your secret using
   * [LibSodium](https://libsodium.gitbook.io/doc/bindings_for_other_languages). For more information, see "[Encrypting secrets for the REST API](https://docs.github.com/rest/guides/encrypting-secrets-for-the-rest-api)."
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * GitHub Apps must have the `secrets` repository permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read secrets.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsCreateOrUpdateRepoSecret()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  actionsCreateOrUpdateRepoSecret$Response(params: ActionsCreateOrUpdateRepoSecret$Params, context?: HttpContext): Observable<StrictHttpResponse<EmptyObject>> {
    return actionsCreateOrUpdateRepoSecret(this.http, this.rootUrl, params, context);
  }

  /**
   * Create or update a repository secret.
   *
   * Creates or updates a repository secret with an encrypted value. Encrypt your secret using
   * [LibSodium](https://libsodium.gitbook.io/doc/bindings_for_other_languages). For more information, see "[Encrypting secrets for the REST API](https://docs.github.com/rest/guides/encrypting-secrets-for-the-rest-api)."
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * GitHub Apps must have the `secrets` repository permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read secrets.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsCreateOrUpdateRepoSecret$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  actionsCreateOrUpdateRepoSecret(params: ActionsCreateOrUpdateRepoSecret$Params, context?: HttpContext): Observable<EmptyObject> {
    return this.actionsCreateOrUpdateRepoSecret$Response(params, context).pipe(
      map((r: StrictHttpResponse<EmptyObject>): EmptyObject => r.body)
    );
  }

  /** Path part for operation `actionsDeleteRepoSecret()` */
  static readonly ActionsDeleteRepoSecretPath = '/repos/{owner}/{repo}/actions/secrets/{secret_name}';

  /**
   * Delete a repository secret.
   *
   * Deletes a secret in a repository using the secret name.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * GitHub Apps must have the `secrets` repository permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read secrets.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsDeleteRepoSecret()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsDeleteRepoSecret$Response(params: ActionsDeleteRepoSecret$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return actionsDeleteRepoSecret(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete a repository secret.
   *
   * Deletes a secret in a repository using the secret name.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * GitHub Apps must have the `secrets` repository permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read secrets.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsDeleteRepoSecret$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsDeleteRepoSecret(params: ActionsDeleteRepoSecret$Params, context?: HttpContext): Observable<void> {
    return this.actionsDeleteRepoSecret$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `actionsListRepoVariables()` */
  static readonly ActionsListRepoVariablesPath = '/repos/{owner}/{repo}/actions/variables';

  /**
   * List repository variables.
   *
   * Lists all repository variables.
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `actions_variables:read` repository permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read variables.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsListRepoVariables()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsListRepoVariables$Response(params: ActionsListRepoVariables$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'variables': Array<ActionsVariable>;
}>> {
    return actionsListRepoVariables(this.http, this.rootUrl, params, context);
  }

  /**
   * List repository variables.
   *
   * Lists all repository variables.
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `actions_variables:read` repository permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read variables.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsListRepoVariables$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsListRepoVariables(params: ActionsListRepoVariables$Params, context?: HttpContext): Observable<{
'total_count': number;
'variables': Array<ActionsVariable>;
}> {
    return this.actionsListRepoVariables$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'total_count': number;
'variables': Array<ActionsVariable>;
}>): {
'total_count': number;
'variables': Array<ActionsVariable>;
} => r.body)
    );
  }

  /** Path part for operation `actionsCreateRepoVariable()` */
  static readonly ActionsCreateRepoVariablePath = '/repos/{owner}/{repo}/actions/variables';

  /**
   * Create a repository variable.
   *
   * Creates a repository variable that you can reference in a GitHub Actions workflow.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `actions_variables:write` repository permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read variables.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsCreateRepoVariable()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  actionsCreateRepoVariable$Response(params: ActionsCreateRepoVariable$Params, context?: HttpContext): Observable<StrictHttpResponse<EmptyObject>> {
    return actionsCreateRepoVariable(this.http, this.rootUrl, params, context);
  }

  /**
   * Create a repository variable.
   *
   * Creates a repository variable that you can reference in a GitHub Actions workflow.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `actions_variables:write` repository permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read variables.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsCreateRepoVariable$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  actionsCreateRepoVariable(params: ActionsCreateRepoVariable$Params, context?: HttpContext): Observable<EmptyObject> {
    return this.actionsCreateRepoVariable$Response(params, context).pipe(
      map((r: StrictHttpResponse<EmptyObject>): EmptyObject => r.body)
    );
  }

  /** Path part for operation `actionsGetRepoVariable()` */
  static readonly ActionsGetRepoVariablePath = '/repos/{owner}/{repo}/actions/variables/{name}';

  /**
   * Get a repository variable.
   *
   * Gets a specific variable in a repository.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `actions_variables:read` repository permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read variables.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsGetRepoVariable()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsGetRepoVariable$Response(params: ActionsGetRepoVariable$Params, context?: HttpContext): Observable<StrictHttpResponse<ActionsVariable>> {
    return actionsGetRepoVariable(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a repository variable.
   *
   * Gets a specific variable in a repository.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `actions_variables:read` repository permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read variables.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsGetRepoVariable$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsGetRepoVariable(params: ActionsGetRepoVariable$Params, context?: HttpContext): Observable<ActionsVariable> {
    return this.actionsGetRepoVariable$Response(params, context).pipe(
      map((r: StrictHttpResponse<ActionsVariable>): ActionsVariable => r.body)
    );
  }

  /** Path part for operation `actionsDeleteRepoVariable()` */
  static readonly ActionsDeleteRepoVariablePath = '/repos/{owner}/{repo}/actions/variables/{name}';

  /**
   * Delete a repository variable.
   *
   * Deletes a repository variable using the variable name.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `actions_variables:write` repository permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read variables.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsDeleteRepoVariable()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsDeleteRepoVariable$Response(params: ActionsDeleteRepoVariable$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return actionsDeleteRepoVariable(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete a repository variable.
   *
   * Deletes a repository variable using the variable name.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `actions_variables:write` repository permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read variables.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsDeleteRepoVariable$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsDeleteRepoVariable(params: ActionsDeleteRepoVariable$Params, context?: HttpContext): Observable<void> {
    return this.actionsDeleteRepoVariable$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `actionsUpdateRepoVariable()` */
  static readonly ActionsUpdateRepoVariablePath = '/repos/{owner}/{repo}/actions/variables/{name}';

  /**
   * Update a repository variable.
   *
   * Updates a repository variable that you can reference in a GitHub Actions workflow.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `actions_variables:write` repository permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read variables.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsUpdateRepoVariable()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  actionsUpdateRepoVariable$Response(params: ActionsUpdateRepoVariable$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return actionsUpdateRepoVariable(this.http, this.rootUrl, params, context);
  }

  /**
   * Update a repository variable.
   *
   * Updates a repository variable that you can reference in a GitHub Actions workflow.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `actions_variables:write` repository permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read variables.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsUpdateRepoVariable$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  actionsUpdateRepoVariable(params: ActionsUpdateRepoVariable$Params, context?: HttpContext): Observable<void> {
    return this.actionsUpdateRepoVariable$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `actionsListRepoWorkflows()` */
  static readonly ActionsListRepoWorkflowsPath = '/repos/{owner}/{repo}/actions/workflows';

  /**
   * List repository workflows.
   *
   * Lists the workflows in a repository. Anyone with read access to the repository can use this endpoint. If the repository is private you must use an access token with the `repo` scope. GitHub Apps must have the `actions:read` permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsListRepoWorkflows()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsListRepoWorkflows$Response(params: ActionsListRepoWorkflows$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'workflows': Array<Workflow>;
}>> {
    return actionsListRepoWorkflows(this.http, this.rootUrl, params, context);
  }

  /**
   * List repository workflows.
   *
   * Lists the workflows in a repository. Anyone with read access to the repository can use this endpoint. If the repository is private you must use an access token with the `repo` scope. GitHub Apps must have the `actions:read` permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsListRepoWorkflows$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsListRepoWorkflows(params: ActionsListRepoWorkflows$Params, context?: HttpContext): Observable<{
'total_count': number;
'workflows': Array<Workflow>;
}> {
    return this.actionsListRepoWorkflows$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'total_count': number;
'workflows': Array<Workflow>;
}>): {
'total_count': number;
'workflows': Array<Workflow>;
} => r.body)
    );
  }

  /** Path part for operation `actionsGetWorkflow()` */
  static readonly ActionsGetWorkflowPath = '/repos/{owner}/{repo}/actions/workflows/{workflow_id}';

  /**
   * Get a workflow.
   *
   * Gets a specific workflow. You can replace `workflow_id` with the workflow file name. For example, you could use `main.yaml`. Anyone with read access to the repository can use this endpoint. If the repository is private you must use an access token with the `repo` scope. GitHub Apps must have the `actions:read` permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsGetWorkflow()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsGetWorkflow$Response(params: ActionsGetWorkflow$Params, context?: HttpContext): Observable<StrictHttpResponse<Workflow>> {
    return actionsGetWorkflow(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a workflow.
   *
   * Gets a specific workflow. You can replace `workflow_id` with the workflow file name. For example, you could use `main.yaml`. Anyone with read access to the repository can use this endpoint. If the repository is private you must use an access token with the `repo` scope. GitHub Apps must have the `actions:read` permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsGetWorkflow$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsGetWorkflow(params: ActionsGetWorkflow$Params, context?: HttpContext): Observable<Workflow> {
    return this.actionsGetWorkflow$Response(params, context).pipe(
      map((r: StrictHttpResponse<Workflow>): Workflow => r.body)
    );
  }

  /** Path part for operation `actionsDisableWorkflow()` */
  static readonly ActionsDisableWorkflowPath = '/repos/{owner}/{repo}/actions/workflows/{workflow_id}/disable';

  /**
   * Disable a workflow.
   *
   * Disables a workflow and sets the `state` of the workflow to `disabled_manually`. You can replace `workflow_id` with the workflow file name. For example, you could use `main.yaml`.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint. GitHub Apps must have the `actions:write` permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsDisableWorkflow()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsDisableWorkflow$Response(params: ActionsDisableWorkflow$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return actionsDisableWorkflow(this.http, this.rootUrl, params, context);
  }

  /**
   * Disable a workflow.
   *
   * Disables a workflow and sets the `state` of the workflow to `disabled_manually`. You can replace `workflow_id` with the workflow file name. For example, you could use `main.yaml`.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint. GitHub Apps must have the `actions:write` permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsDisableWorkflow$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsDisableWorkflow(params: ActionsDisableWorkflow$Params, context?: HttpContext): Observable<void> {
    return this.actionsDisableWorkflow$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `actionsCreateWorkflowDispatch()` */
  static readonly ActionsCreateWorkflowDispatchPath = '/repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches';

  /**
   * Create a workflow dispatch event.
   *
   * You can use this endpoint to manually trigger a GitHub Actions workflow run. You can replace `workflow_id` with the workflow file name. For example, you could use `main.yaml`.
   *
   * You must configure your GitHub Actions workflow to run when the [`workflow_dispatch` webhook](/developers/webhooks-and-events/webhook-events-and-payloads#workflow_dispatch) event occurs. The `inputs` are configured in the workflow file. For more information about how to configure the `workflow_dispatch` event in the workflow file, see "[Events that trigger workflows](/actions/reference/events-that-trigger-workflows#workflow_dispatch)."
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint. GitHub Apps must have the `actions:write` permission to use this endpoint. For more information, see "[Creating a personal access token for the command line](https://docs.github.com/articles/creating-a-personal-access-token-for-the-command-line)."
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsCreateWorkflowDispatch()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  actionsCreateWorkflowDispatch$Response(params: ActionsCreateWorkflowDispatch$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return actionsCreateWorkflowDispatch(this.http, this.rootUrl, params, context);
  }

  /**
   * Create a workflow dispatch event.
   *
   * You can use this endpoint to manually trigger a GitHub Actions workflow run. You can replace `workflow_id` with the workflow file name. For example, you could use `main.yaml`.
   *
   * You must configure your GitHub Actions workflow to run when the [`workflow_dispatch` webhook](/developers/webhooks-and-events/webhook-events-and-payloads#workflow_dispatch) event occurs. The `inputs` are configured in the workflow file. For more information about how to configure the `workflow_dispatch` event in the workflow file, see "[Events that trigger workflows](/actions/reference/events-that-trigger-workflows#workflow_dispatch)."
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint. GitHub Apps must have the `actions:write` permission to use this endpoint. For more information, see "[Creating a personal access token for the command line](https://docs.github.com/articles/creating-a-personal-access-token-for-the-command-line)."
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsCreateWorkflowDispatch$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  actionsCreateWorkflowDispatch(params: ActionsCreateWorkflowDispatch$Params, context?: HttpContext): Observable<void> {
    return this.actionsCreateWorkflowDispatch$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `actionsEnableWorkflow()` */
  static readonly ActionsEnableWorkflowPath = '/repos/{owner}/{repo}/actions/workflows/{workflow_id}/enable';

  /**
   * Enable a workflow.
   *
   * Enables a workflow and sets the `state` of the workflow to `active`. You can replace `workflow_id` with the workflow file name. For example, you could use `main.yaml`.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint. GitHub Apps must have the `actions:write` permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsEnableWorkflow()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsEnableWorkflow$Response(params: ActionsEnableWorkflow$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return actionsEnableWorkflow(this.http, this.rootUrl, params, context);
  }

  /**
   * Enable a workflow.
   *
   * Enables a workflow and sets the `state` of the workflow to `active`. You can replace `workflow_id` with the workflow file name. For example, you could use `main.yaml`.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint. GitHub Apps must have the `actions:write` permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsEnableWorkflow$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsEnableWorkflow(params: ActionsEnableWorkflow$Params, context?: HttpContext): Observable<void> {
    return this.actionsEnableWorkflow$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `actionsListWorkflowRuns()` */
  static readonly ActionsListWorkflowRunsPath = '/repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs';

  /**
   * List workflow runs for a workflow.
   *
   * List all workflow runs for a workflow. You can replace `workflow_id` with the workflow file name. For example, you could use `main.yaml`. You can use parameters to narrow the list of results. For more information about using parameters, see [Parameters](https://docs.github.com/rest/overview/resources-in-the-rest-api#parameters).
   *
   * Anyone with read access to the repository can use this endpoint. If the repository is private you must use an access token with the `repo` scope.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsListWorkflowRuns()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsListWorkflowRuns$Response(params: ActionsListWorkflowRuns$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'workflow_runs': Array<WorkflowRun>;
}>> {
    return actionsListWorkflowRuns(this.http, this.rootUrl, params, context);
  }

  /**
   * List workflow runs for a workflow.
   *
   * List all workflow runs for a workflow. You can replace `workflow_id` with the workflow file name. For example, you could use `main.yaml`. You can use parameters to narrow the list of results. For more information about using parameters, see [Parameters](https://docs.github.com/rest/overview/resources-in-the-rest-api#parameters).
   *
   * Anyone with read access to the repository can use this endpoint. If the repository is private you must use an access token with the `repo` scope.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsListWorkflowRuns$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsListWorkflowRuns(params: ActionsListWorkflowRuns$Params, context?: HttpContext): Observable<{
'total_count': number;
'workflow_runs': Array<WorkflowRun>;
}> {
    return this.actionsListWorkflowRuns$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'total_count': number;
'workflow_runs': Array<WorkflowRun>;
}>): {
'total_count': number;
'workflow_runs': Array<WorkflowRun>;
} => r.body)
    );
  }

  /** Path part for operation `actionsGetWorkflowUsage()` */
  static readonly ActionsGetWorkflowUsagePath = '/repos/{owner}/{repo}/actions/workflows/{workflow_id}/timing';

  /**
   * Get workflow usage.
   *
   * Gets the number of billable minutes used by a specific workflow during the current billing cycle. Billable minutes only apply to workflows in private repositories that use GitHub-hosted runners. Usage is listed for each GitHub-hosted runner operating system in milliseconds. Any job re-runs are also included in the usage. The usage does not include the multiplier for macOS and Windows runners and is not rounded up to the nearest whole minute. For more information, see "[Managing billing for GitHub Actions](https://docs.github.com/github/setting-up-and-managing-billing-and-payments-on-github/managing-billing-for-github-actions)".
   *
   * You can replace `workflow_id` with the workflow file name. For example, you could use `main.yaml`. Anyone with read access to the repository can use this endpoint. If the repository is private you must use an access token with the `repo` scope. GitHub Apps must have the `actions:read` permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsGetWorkflowUsage()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsGetWorkflowUsage$Response(params: ActionsGetWorkflowUsage$Params, context?: HttpContext): Observable<StrictHttpResponse<WorkflowUsage>> {
    return actionsGetWorkflowUsage(this.http, this.rootUrl, params, context);
  }

  /**
   * Get workflow usage.
   *
   * Gets the number of billable minutes used by a specific workflow during the current billing cycle. Billable minutes only apply to workflows in private repositories that use GitHub-hosted runners. Usage is listed for each GitHub-hosted runner operating system in milliseconds. Any job re-runs are also included in the usage. The usage does not include the multiplier for macOS and Windows runners and is not rounded up to the nearest whole minute. For more information, see "[Managing billing for GitHub Actions](https://docs.github.com/github/setting-up-and-managing-billing-and-payments-on-github/managing-billing-for-github-actions)".
   *
   * You can replace `workflow_id` with the workflow file name. For example, you could use `main.yaml`. Anyone with read access to the repository can use this endpoint. If the repository is private you must use an access token with the `repo` scope. GitHub Apps must have the `actions:read` permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsGetWorkflowUsage$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsGetWorkflowUsage(params: ActionsGetWorkflowUsage$Params, context?: HttpContext): Observable<WorkflowUsage> {
    return this.actionsGetWorkflowUsage$Response(params, context).pipe(
      map((r: StrictHttpResponse<WorkflowUsage>): WorkflowUsage => r.body)
    );
  }

  /** Path part for operation `actionsListEnvironmentSecrets()` */
  static readonly ActionsListEnvironmentSecretsPath = '/repositories/{repository_id}/environments/{environment_name}/secrets';

  /**
   * List environment secrets.
   *
   * Lists all secrets available in an environment without revealing their
   * encrypted values.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * GitHub Apps must have the `secrets` repository permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read secrets.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsListEnvironmentSecrets()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsListEnvironmentSecrets$Response(params: ActionsListEnvironmentSecrets$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'secrets': Array<ActionsSecret>;
}>> {
    return actionsListEnvironmentSecrets(this.http, this.rootUrl, params, context);
  }

  /**
   * List environment secrets.
   *
   * Lists all secrets available in an environment without revealing their
   * encrypted values.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * GitHub Apps must have the `secrets` repository permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read secrets.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsListEnvironmentSecrets$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsListEnvironmentSecrets(params: ActionsListEnvironmentSecrets$Params, context?: HttpContext): Observable<{
'total_count': number;
'secrets': Array<ActionsSecret>;
}> {
    return this.actionsListEnvironmentSecrets$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'total_count': number;
'secrets': Array<ActionsSecret>;
}>): {
'total_count': number;
'secrets': Array<ActionsSecret>;
} => r.body)
    );
  }

  /** Path part for operation `actionsGetEnvironmentPublicKey()` */
  static readonly ActionsGetEnvironmentPublicKeyPath = '/repositories/{repository_id}/environments/{environment_name}/secrets/public-key';

  /**
   * Get an environment public key.
   *
   * Get the public key for an environment, which you need to encrypt environment
   * secrets. You need to encrypt a secret before you can create or update secrets.
   *
   * Anyone with read access to the repository can use this endpoint.
   * If the repository is private you must use an access token with the `repo` scope.
   * GitHub Apps must have the `secrets` repository permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read secrets.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsGetEnvironmentPublicKey()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsGetEnvironmentPublicKey$Response(params: ActionsGetEnvironmentPublicKey$Params, context?: HttpContext): Observable<StrictHttpResponse<ActionsPublicKey>> {
    return actionsGetEnvironmentPublicKey(this.http, this.rootUrl, params, context);
  }

  /**
   * Get an environment public key.
   *
   * Get the public key for an environment, which you need to encrypt environment
   * secrets. You need to encrypt a secret before you can create or update secrets.
   *
   * Anyone with read access to the repository can use this endpoint.
   * If the repository is private you must use an access token with the `repo` scope.
   * GitHub Apps must have the `secrets` repository permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read secrets.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsGetEnvironmentPublicKey$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsGetEnvironmentPublicKey(params: ActionsGetEnvironmentPublicKey$Params, context?: HttpContext): Observable<ActionsPublicKey> {
    return this.actionsGetEnvironmentPublicKey$Response(params, context).pipe(
      map((r: StrictHttpResponse<ActionsPublicKey>): ActionsPublicKey => r.body)
    );
  }

  /** Path part for operation `actionsGetEnvironmentSecret()` */
  static readonly ActionsGetEnvironmentSecretPath = '/repositories/{repository_id}/environments/{environment_name}/secrets/{secret_name}';

  /**
   * Get an environment secret.
   *
   * Gets a single environment secret without revealing its encrypted value.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * GitHub Apps must have the `secrets` repository permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read secrets.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsGetEnvironmentSecret()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsGetEnvironmentSecret$Response(params: ActionsGetEnvironmentSecret$Params, context?: HttpContext): Observable<StrictHttpResponse<ActionsSecret>> {
    return actionsGetEnvironmentSecret(this.http, this.rootUrl, params, context);
  }

  /**
   * Get an environment secret.
   *
   * Gets a single environment secret without revealing its encrypted value.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * GitHub Apps must have the `secrets` repository permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read secrets.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsGetEnvironmentSecret$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsGetEnvironmentSecret(params: ActionsGetEnvironmentSecret$Params, context?: HttpContext): Observable<ActionsSecret> {
    return this.actionsGetEnvironmentSecret$Response(params, context).pipe(
      map((r: StrictHttpResponse<ActionsSecret>): ActionsSecret => r.body)
    );
  }

  /** Path part for operation `actionsCreateOrUpdateEnvironmentSecret()` */
  static readonly ActionsCreateOrUpdateEnvironmentSecretPath = '/repositories/{repository_id}/environments/{environment_name}/secrets/{secret_name}';

  /**
   * Create or update an environment secret.
   *
   * Creates or updates an environment secret with an encrypted value. Encrypt your secret using
   * [LibSodium](https://libsodium.gitbook.io/doc/bindings_for_other_languages). For more information, see "[Encrypting secrets for the REST API](https://docs.github.com/rest/guides/encrypting-secrets-for-the-rest-api)."
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * GitHub Apps must have the `secrets` repository permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read secrets.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsCreateOrUpdateEnvironmentSecret()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  actionsCreateOrUpdateEnvironmentSecret$Response(params: ActionsCreateOrUpdateEnvironmentSecret$Params, context?: HttpContext): Observable<StrictHttpResponse<EmptyObject>> {
    return actionsCreateOrUpdateEnvironmentSecret(this.http, this.rootUrl, params, context);
  }

  /**
   * Create or update an environment secret.
   *
   * Creates or updates an environment secret with an encrypted value. Encrypt your secret using
   * [LibSodium](https://libsodium.gitbook.io/doc/bindings_for_other_languages). For more information, see "[Encrypting secrets for the REST API](https://docs.github.com/rest/guides/encrypting-secrets-for-the-rest-api)."
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * GitHub Apps must have the `secrets` repository permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read secrets.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsCreateOrUpdateEnvironmentSecret$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  actionsCreateOrUpdateEnvironmentSecret(params: ActionsCreateOrUpdateEnvironmentSecret$Params, context?: HttpContext): Observable<EmptyObject> {
    return this.actionsCreateOrUpdateEnvironmentSecret$Response(params, context).pipe(
      map((r: StrictHttpResponse<EmptyObject>): EmptyObject => r.body)
    );
  }

  /** Path part for operation `actionsDeleteEnvironmentSecret()` */
  static readonly ActionsDeleteEnvironmentSecretPath = '/repositories/{repository_id}/environments/{environment_name}/secrets/{secret_name}';

  /**
   * Delete an environment secret.
   *
   * Deletes a secret in an environment using the secret name.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * GitHub Apps must have the `secrets` repository permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read secrets.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsDeleteEnvironmentSecret()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsDeleteEnvironmentSecret$Response(params: ActionsDeleteEnvironmentSecret$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return actionsDeleteEnvironmentSecret(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete an environment secret.
   *
   * Deletes a secret in an environment using the secret name.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * GitHub Apps must have the `secrets` repository permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read secrets.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsDeleteEnvironmentSecret$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsDeleteEnvironmentSecret(params: ActionsDeleteEnvironmentSecret$Params, context?: HttpContext): Observable<void> {
    return this.actionsDeleteEnvironmentSecret$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `actionsListEnvironmentVariables()` */
  static readonly ActionsListEnvironmentVariablesPath = '/repositories/{repository_id}/environments/{environment_name}/variables';

  /**
   * List environment variables.
   *
   * Lists all environment variables.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `environments:read` repository permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read variables.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsListEnvironmentVariables()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsListEnvironmentVariables$Response(params: ActionsListEnvironmentVariables$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'variables': Array<ActionsVariable>;
}>> {
    return actionsListEnvironmentVariables(this.http, this.rootUrl, params, context);
  }

  /**
   * List environment variables.
   *
   * Lists all environment variables.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `environments:read` repository permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read variables.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsListEnvironmentVariables$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsListEnvironmentVariables(params: ActionsListEnvironmentVariables$Params, context?: HttpContext): Observable<{
'total_count': number;
'variables': Array<ActionsVariable>;
}> {
    return this.actionsListEnvironmentVariables$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'total_count': number;
'variables': Array<ActionsVariable>;
}>): {
'total_count': number;
'variables': Array<ActionsVariable>;
} => r.body)
    );
  }

  /** Path part for operation `actionsCreateEnvironmentVariable()` */
  static readonly ActionsCreateEnvironmentVariablePath = '/repositories/{repository_id}/environments/{environment_name}/variables';

  /**
   * Create an environment variable.
   *
   * Create an environment variable that you can reference in a GitHub Actions workflow.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `environment:write` repository permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read variables.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsCreateEnvironmentVariable()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  actionsCreateEnvironmentVariable$Response(params: ActionsCreateEnvironmentVariable$Params, context?: HttpContext): Observable<StrictHttpResponse<EmptyObject>> {
    return actionsCreateEnvironmentVariable(this.http, this.rootUrl, params, context);
  }

  /**
   * Create an environment variable.
   *
   * Create an environment variable that you can reference in a GitHub Actions workflow.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `environment:write` repository permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read variables.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsCreateEnvironmentVariable$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  actionsCreateEnvironmentVariable(params: ActionsCreateEnvironmentVariable$Params, context?: HttpContext): Observable<EmptyObject> {
    return this.actionsCreateEnvironmentVariable$Response(params, context).pipe(
      map((r: StrictHttpResponse<EmptyObject>): EmptyObject => r.body)
    );
  }

  /** Path part for operation `actionsGetEnvironmentVariable()` */
  static readonly ActionsGetEnvironmentVariablePath = '/repositories/{repository_id}/environments/{environment_name}/variables/{name}';

  /**
   * Get an environment variable.
   *
   * Gets a specific variable in an environment.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `environments:read` repository permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read variables.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsGetEnvironmentVariable()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsGetEnvironmentVariable$Response(params: ActionsGetEnvironmentVariable$Params, context?: HttpContext): Observable<StrictHttpResponse<ActionsVariable>> {
    return actionsGetEnvironmentVariable(this.http, this.rootUrl, params, context);
  }

  /**
   * Get an environment variable.
   *
   * Gets a specific variable in an environment.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `environments:read` repository permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read variables.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsGetEnvironmentVariable$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsGetEnvironmentVariable(params: ActionsGetEnvironmentVariable$Params, context?: HttpContext): Observable<ActionsVariable> {
    return this.actionsGetEnvironmentVariable$Response(params, context).pipe(
      map((r: StrictHttpResponse<ActionsVariable>): ActionsVariable => r.body)
    );
  }

  /** Path part for operation `actionsDeleteEnvironmentVariable()` */
  static readonly ActionsDeleteEnvironmentVariablePath = '/repositories/{repository_id}/environments/{environment_name}/variables/{name}';

  /**
   * Delete an environment variable.
   *
   * Deletes an environment variable using the variable name.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `environment:write` repository permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read variables.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsDeleteEnvironmentVariable()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsDeleteEnvironmentVariable$Response(params: ActionsDeleteEnvironmentVariable$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return actionsDeleteEnvironmentVariable(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete an environment variable.
   *
   * Deletes an environment variable using the variable name.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `environment:write` repository permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read variables.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsDeleteEnvironmentVariable$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  actionsDeleteEnvironmentVariable(params: ActionsDeleteEnvironmentVariable$Params, context?: HttpContext): Observable<void> {
    return this.actionsDeleteEnvironmentVariable$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `actionsUpdateEnvironmentVariable()` */
  static readonly ActionsUpdateEnvironmentVariablePath = '/repositories/{repository_id}/environments/{environment_name}/variables/{name}';

  /**
   * Update an environment variable.
   *
   * Updates an environment variable that you can reference in a GitHub Actions workflow.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `environment:write` repository permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read variables.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `actionsUpdateEnvironmentVariable()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  actionsUpdateEnvironmentVariable$Response(params: ActionsUpdateEnvironmentVariable$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return actionsUpdateEnvironmentVariable(this.http, this.rootUrl, params, context);
  }

  /**
   * Update an environment variable.
   *
   * Updates an environment variable that you can reference in a GitHub Actions workflow.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint.
   * If the repository is private, you must use an access token with the `repo` scope.
   * GitHub Apps must have the `environment:write` repository permission to use this endpoint.
   * Authenticated users must have collaborator access to a repository to create, update, or read variables.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `actionsUpdateEnvironmentVariable$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  actionsUpdateEnvironmentVariable(params: ActionsUpdateEnvironmentVariable$Params, context?: HttpContext): Observable<void> {
    return this.actionsUpdateEnvironmentVariable$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

}
