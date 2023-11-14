/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { BaseService } from '../base-service';
import { ApiConfiguration } from '../api-configuration';
import { StrictHttpResponse } from '../strict-http-response';

import { Activity } from '../models/activity';
import { Autolink } from '../models/autolink';
import { BranchProtection } from '../models/branch-protection';
import { BranchRestrictionPolicy } from '../models/branch-restriction-policy';
import { BranchShort } from '../models/branch-short';
import { BranchWithProtection } from '../models/branch-with-protection';
import { CheckAutomatedSecurityFixes } from '../models/check-automated-security-fixes';
import { CloneTraffic } from '../models/clone-traffic';
import { CodeFrequencyStat } from '../models/code-frequency-stat';
import { CodeownersErrors } from '../models/codeowners-errors';
import { Collaborator } from '../models/collaborator';
import { CombinedCommitStatus } from '../models/combined-commit-status';
import { Commit } from '../models/commit';
import { CommitActivity } from '../models/commit-activity';
import { CommitComment } from '../models/commit-comment';
import { CommitComparison } from '../models/commit-comparison';
import { CommunityProfile } from '../models/community-profile';
import { ContentDirectory } from '../models/content-directory';
import { ContentFile } from '../models/content-file';
import { ContentSubmodule } from '../models/content-submodule';
import { ContentSymlink } from '../models/content-symlink';
import { ContentTraffic } from '../models/content-traffic';
import { ContentTree } from '../models/content-tree';
import { Contributor } from '../models/contributor';
import { ContributorActivity } from '../models/contributor-activity';
import { CustomDeploymentRuleApp } from '../models/custom-deployment-rule-app';
import { DeployKey } from '../models/deploy-key';
import { Deployment } from '../models/deployment';
import { DeploymentBranchPolicy } from '../models/deployment-branch-policy';
import { DeploymentProtectionRule } from '../models/deployment-protection-rule';
import { DeploymentStatus } from '../models/deployment-status';
import { Environment } from '../models/environment';
import { FileCommit } from '../models/file-commit';
import { FullRepository } from '../models/full-repository';
import { Hook } from '../models/hook';
import { HookDelivery } from '../models/hook-delivery';
import { HookDeliveryItem } from '../models/hook-delivery-item';
import { Integration } from '../models/integration';
import { Language } from '../models/language';
import { MergedUpstream } from '../models/merged-upstream';
import { MinimalRepository } from '../models/minimal-repository';
import { Page } from '../models/page';
import { PageBuild } from '../models/page-build';
import { PageBuildStatus } from '../models/page-build-status';
import { PageDeployment } from '../models/page-deployment';
import { PagesHealthCheck } from '../models/pages-health-check';
import { ParticipationStats } from '../models/participation-stats';
import { ProtectedBranch } from '../models/protected-branch';
import { ProtectedBranchAdminEnforced } from '../models/protected-branch-admin-enforced';
import { ProtectedBranchPullRequestReview } from '../models/protected-branch-pull-request-review';
import { PullRequestSimple } from '../models/pull-request-simple';
import { ReferrerTraffic } from '../models/referrer-traffic';
import { Release } from '../models/release';
import { ReleaseAsset } from '../models/release-asset';
import { ReleaseNotesContent } from '../models/release-notes-content';
import { reposAcceptInvitationForAuthenticatedUser } from '../fn/repos/repos-accept-invitation-for-authenticated-user';
import { ReposAcceptInvitationForAuthenticatedUser$Params } from '../fn/repos/repos-accept-invitation-for-authenticated-user';
import { reposAddAppAccessRestrictions } from '../fn/repos/repos-add-app-access-restrictions';
import { ReposAddAppAccessRestrictions$Params } from '../fn/repos/repos-add-app-access-restrictions';
import { reposAddCollaborator } from '../fn/repos/repos-add-collaborator';
import { ReposAddCollaborator$Params } from '../fn/repos/repos-add-collaborator';
import { reposAddStatusCheckContexts } from '../fn/repos/repos-add-status-check-contexts';
import { ReposAddStatusCheckContexts$Params } from '../fn/repos/repos-add-status-check-contexts';
import { reposAddTeamAccessRestrictions } from '../fn/repos/repos-add-team-access-restrictions';
import { ReposAddTeamAccessRestrictions$Params } from '../fn/repos/repos-add-team-access-restrictions';
import { reposAddUserAccessRestrictions } from '../fn/repos/repos-add-user-access-restrictions';
import { ReposAddUserAccessRestrictions$Params } from '../fn/repos/repos-add-user-access-restrictions';
import { reposCheckAutomatedSecurityFixes } from '../fn/repos/repos-check-automated-security-fixes';
import { ReposCheckAutomatedSecurityFixes$Params } from '../fn/repos/repos-check-automated-security-fixes';
import { reposCheckCollaborator } from '../fn/repos/repos-check-collaborator';
import { ReposCheckCollaborator$Params } from '../fn/repos/repos-check-collaborator';
import { reposCheckVulnerabilityAlerts } from '../fn/repos/repos-check-vulnerability-alerts';
import { ReposCheckVulnerabilityAlerts$Params } from '../fn/repos/repos-check-vulnerability-alerts';
import { reposCodeownersErrors } from '../fn/repos/repos-codeowners-errors';
import { ReposCodeownersErrors$Params } from '../fn/repos/repos-codeowners-errors';
import { reposCompareCommits } from '../fn/repos/repos-compare-commits';
import { ReposCompareCommits$Params } from '../fn/repos/repos-compare-commits';
import { reposCreateAutolink } from '../fn/repos/repos-create-autolink';
import { ReposCreateAutolink$Params } from '../fn/repos/repos-create-autolink';
import { reposCreateCommitComment } from '../fn/repos/repos-create-commit-comment';
import { ReposCreateCommitComment$Params } from '../fn/repos/repos-create-commit-comment';
import { reposCreateCommitSignatureProtection } from '../fn/repos/repos-create-commit-signature-protection';
import { ReposCreateCommitSignatureProtection$Params } from '../fn/repos/repos-create-commit-signature-protection';
import { reposCreateCommitStatus } from '../fn/repos/repos-create-commit-status';
import { ReposCreateCommitStatus$Params } from '../fn/repos/repos-create-commit-status';
import { reposCreateDeployKey } from '../fn/repos/repos-create-deploy-key';
import { ReposCreateDeployKey$Params } from '../fn/repos/repos-create-deploy-key';
import { reposCreateDeployment } from '../fn/repos/repos-create-deployment';
import { ReposCreateDeployment$Params } from '../fn/repos/repos-create-deployment';
import { reposCreateDeploymentBranchPolicy } from '../fn/repos/repos-create-deployment-branch-policy';
import { ReposCreateDeploymentBranchPolicy$Params } from '../fn/repos/repos-create-deployment-branch-policy';
import { reposCreateDeploymentProtectionRule } from '../fn/repos/repos-create-deployment-protection-rule';
import { ReposCreateDeploymentProtectionRule$Params } from '../fn/repos/repos-create-deployment-protection-rule';
import { reposCreateDeploymentStatus } from '../fn/repos/repos-create-deployment-status';
import { ReposCreateDeploymentStatus$Params } from '../fn/repos/repos-create-deployment-status';
import { reposCreateDispatchEvent } from '../fn/repos/repos-create-dispatch-event';
import { ReposCreateDispatchEvent$Params } from '../fn/repos/repos-create-dispatch-event';
import { reposCreateForAuthenticatedUser } from '../fn/repos/repos-create-for-authenticated-user';
import { ReposCreateForAuthenticatedUser$Params } from '../fn/repos/repos-create-for-authenticated-user';
import { reposCreateFork } from '../fn/repos/repos-create-fork';
import { ReposCreateFork$Params } from '../fn/repos/repos-create-fork';
import { reposCreateInOrg } from '../fn/repos/repos-create-in-org';
import { ReposCreateInOrg$Params } from '../fn/repos/repos-create-in-org';
import { reposCreateOrgRuleset } from '../fn/repos/repos-create-org-ruleset';
import { ReposCreateOrgRuleset$Params } from '../fn/repos/repos-create-org-ruleset';
import { reposCreateOrUpdateEnvironment } from '../fn/repos/repos-create-or-update-environment';
import { ReposCreateOrUpdateEnvironment$Params } from '../fn/repos/repos-create-or-update-environment';
import { reposCreateOrUpdateFileContents } from '../fn/repos/repos-create-or-update-file-contents';
import { ReposCreateOrUpdateFileContents$Params } from '../fn/repos/repos-create-or-update-file-contents';
import { reposCreatePagesDeployment } from '../fn/repos/repos-create-pages-deployment';
import { ReposCreatePagesDeployment$Params } from '../fn/repos/repos-create-pages-deployment';
import { reposCreatePagesSite } from '../fn/repos/repos-create-pages-site';
import { ReposCreatePagesSite$Params } from '../fn/repos/repos-create-pages-site';
import { reposCreateRelease } from '../fn/repos/repos-create-release';
import { ReposCreateRelease$Params } from '../fn/repos/repos-create-release';
import { reposCreateRepoRuleset } from '../fn/repos/repos-create-repo-ruleset';
import { ReposCreateRepoRuleset$Params } from '../fn/repos/repos-create-repo-ruleset';
import { reposCreateTagProtection } from '../fn/repos/repos-create-tag-protection';
import { ReposCreateTagProtection$Params } from '../fn/repos/repos-create-tag-protection';
import { reposCreateUsingTemplate } from '../fn/repos/repos-create-using-template';
import { ReposCreateUsingTemplate$Params } from '../fn/repos/repos-create-using-template';
import { reposCreateWebhook } from '../fn/repos/repos-create-webhook';
import { ReposCreateWebhook$Params } from '../fn/repos/repos-create-webhook';
import { reposDeclineInvitationForAuthenticatedUser } from '../fn/repos/repos-decline-invitation-for-authenticated-user';
import { ReposDeclineInvitationForAuthenticatedUser$Params } from '../fn/repos/repos-decline-invitation-for-authenticated-user';
import { reposDelete } from '../fn/repos/repos-delete';
import { ReposDelete$Params } from '../fn/repos/repos-delete';
import { reposDeleteAccessRestrictions } from '../fn/repos/repos-delete-access-restrictions';
import { ReposDeleteAccessRestrictions$Params } from '../fn/repos/repos-delete-access-restrictions';
import { reposDeleteAdminBranchProtection } from '../fn/repos/repos-delete-admin-branch-protection';
import { ReposDeleteAdminBranchProtection$Params } from '../fn/repos/repos-delete-admin-branch-protection';
import { reposDeleteAnEnvironment } from '../fn/repos/repos-delete-an-environment';
import { ReposDeleteAnEnvironment$Params } from '../fn/repos/repos-delete-an-environment';
import { reposDeleteAutolink } from '../fn/repos/repos-delete-autolink';
import { ReposDeleteAutolink$Params } from '../fn/repos/repos-delete-autolink';
import { reposDeleteBranchProtection } from '../fn/repos/repos-delete-branch-protection';
import { ReposDeleteBranchProtection$Params } from '../fn/repos/repos-delete-branch-protection';
import { reposDeleteCommitComment } from '../fn/repos/repos-delete-commit-comment';
import { ReposDeleteCommitComment$Params } from '../fn/repos/repos-delete-commit-comment';
import { reposDeleteCommitSignatureProtection } from '../fn/repos/repos-delete-commit-signature-protection';
import { ReposDeleteCommitSignatureProtection$Params } from '../fn/repos/repos-delete-commit-signature-protection';
import { reposDeleteDeployKey } from '../fn/repos/repos-delete-deploy-key';
import { ReposDeleteDeployKey$Params } from '../fn/repos/repos-delete-deploy-key';
import { reposDeleteDeployment } from '../fn/repos/repos-delete-deployment';
import { ReposDeleteDeployment$Params } from '../fn/repos/repos-delete-deployment';
import { reposDeleteDeploymentBranchPolicy } from '../fn/repos/repos-delete-deployment-branch-policy';
import { ReposDeleteDeploymentBranchPolicy$Params } from '../fn/repos/repos-delete-deployment-branch-policy';
import { reposDeleteFile } from '../fn/repos/repos-delete-file';
import { ReposDeleteFile$Params } from '../fn/repos/repos-delete-file';
import { reposDeleteInvitation } from '../fn/repos/repos-delete-invitation';
import { ReposDeleteInvitation$Params } from '../fn/repos/repos-delete-invitation';
import { reposDeleteOrgRuleset } from '../fn/repos/repos-delete-org-ruleset';
import { ReposDeleteOrgRuleset$Params } from '../fn/repos/repos-delete-org-ruleset';
import { reposDeletePagesSite } from '../fn/repos/repos-delete-pages-site';
import { ReposDeletePagesSite$Params } from '../fn/repos/repos-delete-pages-site';
import { reposDeletePullRequestReviewProtection } from '../fn/repos/repos-delete-pull-request-review-protection';
import { ReposDeletePullRequestReviewProtection$Params } from '../fn/repos/repos-delete-pull-request-review-protection';
import { reposDeleteRelease } from '../fn/repos/repos-delete-release';
import { ReposDeleteRelease$Params } from '../fn/repos/repos-delete-release';
import { reposDeleteReleaseAsset } from '../fn/repos/repos-delete-release-asset';
import { ReposDeleteReleaseAsset$Params } from '../fn/repos/repos-delete-release-asset';
import { reposDeleteRepoRuleset } from '../fn/repos/repos-delete-repo-ruleset';
import { ReposDeleteRepoRuleset$Params } from '../fn/repos/repos-delete-repo-ruleset';
import { reposDeleteTagProtection } from '../fn/repos/repos-delete-tag-protection';
import { ReposDeleteTagProtection$Params } from '../fn/repos/repos-delete-tag-protection';
import { reposDeleteWebhook } from '../fn/repos/repos-delete-webhook';
import { ReposDeleteWebhook$Params } from '../fn/repos/repos-delete-webhook';
import { reposDisableAutomatedSecurityFixes } from '../fn/repos/repos-disable-automated-security-fixes';
import { ReposDisableAutomatedSecurityFixes$Params } from '../fn/repos/repos-disable-automated-security-fixes';
import { reposDisableDeploymentProtectionRule } from '../fn/repos/repos-disable-deployment-protection-rule';
import { ReposDisableDeploymentProtectionRule$Params } from '../fn/repos/repos-disable-deployment-protection-rule';
import { reposDisablePrivateVulnerabilityReporting } from '../fn/repos/repos-disable-private-vulnerability-reporting';
import { ReposDisablePrivateVulnerabilityReporting$Params } from '../fn/repos/repos-disable-private-vulnerability-reporting';
import { reposDisableVulnerabilityAlerts } from '../fn/repos/repos-disable-vulnerability-alerts';
import { ReposDisableVulnerabilityAlerts$Params } from '../fn/repos/repos-disable-vulnerability-alerts';
import { reposDownloadTarballArchive } from '../fn/repos/repos-download-tarball-archive';
import { ReposDownloadTarballArchive$Params } from '../fn/repos/repos-download-tarball-archive';
import { reposDownloadZipballArchive } from '../fn/repos/repos-download-zipball-archive';
import { ReposDownloadZipballArchive$Params } from '../fn/repos/repos-download-zipball-archive';
import { reposEnableAutomatedSecurityFixes } from '../fn/repos/repos-enable-automated-security-fixes';
import { ReposEnableAutomatedSecurityFixes$Params } from '../fn/repos/repos-enable-automated-security-fixes';
import { reposEnablePrivateVulnerabilityReporting } from '../fn/repos/repos-enable-private-vulnerability-reporting';
import { ReposEnablePrivateVulnerabilityReporting$Params } from '../fn/repos/repos-enable-private-vulnerability-reporting';
import { reposEnableVulnerabilityAlerts } from '../fn/repos/repos-enable-vulnerability-alerts';
import { ReposEnableVulnerabilityAlerts$Params } from '../fn/repos/repos-enable-vulnerability-alerts';
import { reposGenerateReleaseNotes } from '../fn/repos/repos-generate-release-notes';
import { ReposGenerateReleaseNotes$Params } from '../fn/repos/repos-generate-release-notes';
import { reposGet } from '../fn/repos/repos-get';
import { ReposGet$Params } from '../fn/repos/repos-get';
import { reposGetAccessRestrictions } from '../fn/repos/repos-get-access-restrictions';
import { ReposGetAccessRestrictions$Params } from '../fn/repos/repos-get-access-restrictions';
import { reposGetAdminBranchProtection } from '../fn/repos/repos-get-admin-branch-protection';
import { ReposGetAdminBranchProtection$Params } from '../fn/repos/repos-get-admin-branch-protection';
import { reposGetAllDeploymentProtectionRules } from '../fn/repos/repos-get-all-deployment-protection-rules';
import { ReposGetAllDeploymentProtectionRules$Params } from '../fn/repos/repos-get-all-deployment-protection-rules';
import { reposGetAllEnvironments } from '../fn/repos/repos-get-all-environments';
import { ReposGetAllEnvironments$Params } from '../fn/repos/repos-get-all-environments';
import { reposGetAllStatusCheckContexts } from '../fn/repos/repos-get-all-status-check-contexts';
import { ReposGetAllStatusCheckContexts$Params } from '../fn/repos/repos-get-all-status-check-contexts';
import { reposGetAllTopics } from '../fn/repos/repos-get-all-topics';
import { ReposGetAllTopics$Params } from '../fn/repos/repos-get-all-topics';
import { reposGetAppsWithAccessToProtectedBranch } from '../fn/repos/repos-get-apps-with-access-to-protected-branch';
import { ReposGetAppsWithAccessToProtectedBranch$Params } from '../fn/repos/repos-get-apps-with-access-to-protected-branch';
import { reposGetAutolink } from '../fn/repos/repos-get-autolink';
import { ReposGetAutolink$Params } from '../fn/repos/repos-get-autolink';
import { reposGetBranch } from '../fn/repos/repos-get-branch';
import { ReposGetBranch$Params } from '../fn/repos/repos-get-branch';
import { reposGetBranchProtection } from '../fn/repos/repos-get-branch-protection';
import { ReposGetBranchProtection$Params } from '../fn/repos/repos-get-branch-protection';
import { reposGetBranchRules } from '../fn/repos/repos-get-branch-rules';
import { ReposGetBranchRules$Params } from '../fn/repos/repos-get-branch-rules';
import { reposGetClones } from '../fn/repos/repos-get-clones';
import { ReposGetClones$Params } from '../fn/repos/repos-get-clones';
import { reposGetCodeFrequencyStats } from '../fn/repos/repos-get-code-frequency-stats';
import { ReposGetCodeFrequencyStats$Params } from '../fn/repos/repos-get-code-frequency-stats';
import { reposGetCollaboratorPermissionLevel } from '../fn/repos/repos-get-collaborator-permission-level';
import { ReposGetCollaboratorPermissionLevel$Params } from '../fn/repos/repos-get-collaborator-permission-level';
import { reposGetCombinedStatusForRef } from '../fn/repos/repos-get-combined-status-for-ref';
import { ReposGetCombinedStatusForRef$Params } from '../fn/repos/repos-get-combined-status-for-ref';
import { reposGetCommit } from '../fn/repos/repos-get-commit';
import { ReposGetCommit$Params } from '../fn/repos/repos-get-commit';
import { reposGetCommitActivityStats } from '../fn/repos/repos-get-commit-activity-stats';
import { ReposGetCommitActivityStats$Params } from '../fn/repos/repos-get-commit-activity-stats';
import { reposGetCommitComment } from '../fn/repos/repos-get-commit-comment';
import { ReposGetCommitComment$Params } from '../fn/repos/repos-get-commit-comment';
import { reposGetCommitSignatureProtection } from '../fn/repos/repos-get-commit-signature-protection';
import { ReposGetCommitSignatureProtection$Params } from '../fn/repos/repos-get-commit-signature-protection';
import { reposGetCommunityProfileMetrics } from '../fn/repos/repos-get-community-profile-metrics';
import { ReposGetCommunityProfileMetrics$Params } from '../fn/repos/repos-get-community-profile-metrics';
import { reposGetContent$Json } from '../fn/repos/repos-get-content-json';
import { ReposGetContent$Json$Params } from '../fn/repos/repos-get-content-json';
import { reposGetContent$VndGithubObject } from '../fn/repos/repos-get-content-vnd-github-object';
import { ReposGetContent$VndGithubObject$Params } from '../fn/repos/repos-get-content-vnd-github-object';
import { reposGetContributorsStats } from '../fn/repos/repos-get-contributors-stats';
import { ReposGetContributorsStats$Params } from '../fn/repos/repos-get-contributors-stats';
import { reposGetCustomDeploymentProtectionRule } from '../fn/repos/repos-get-custom-deployment-protection-rule';
import { ReposGetCustomDeploymentProtectionRule$Params } from '../fn/repos/repos-get-custom-deployment-protection-rule';
import { reposGetDeployKey } from '../fn/repos/repos-get-deploy-key';
import { ReposGetDeployKey$Params } from '../fn/repos/repos-get-deploy-key';
import { reposGetDeployment } from '../fn/repos/repos-get-deployment';
import { ReposGetDeployment$Params } from '../fn/repos/repos-get-deployment';
import { reposGetDeploymentBranchPolicy } from '../fn/repos/repos-get-deployment-branch-policy';
import { ReposGetDeploymentBranchPolicy$Params } from '../fn/repos/repos-get-deployment-branch-policy';
import { reposGetDeploymentStatus } from '../fn/repos/repos-get-deployment-status';
import { ReposGetDeploymentStatus$Params } from '../fn/repos/repos-get-deployment-status';
import { reposGetEnvironment } from '../fn/repos/repos-get-environment';
import { ReposGetEnvironment$Params } from '../fn/repos/repos-get-environment';
import { reposGetLatestPagesBuild } from '../fn/repos/repos-get-latest-pages-build';
import { ReposGetLatestPagesBuild$Params } from '../fn/repos/repos-get-latest-pages-build';
import { reposGetLatestRelease } from '../fn/repos/repos-get-latest-release';
import { ReposGetLatestRelease$Params } from '../fn/repos/repos-get-latest-release';
import { reposGetOrgRuleset } from '../fn/repos/repos-get-org-ruleset';
import { ReposGetOrgRuleset$Params } from '../fn/repos/repos-get-org-ruleset';
import { reposGetOrgRulesets } from '../fn/repos/repos-get-org-rulesets';
import { ReposGetOrgRulesets$Params } from '../fn/repos/repos-get-org-rulesets';
import { reposGetPages } from '../fn/repos/repos-get-pages';
import { ReposGetPages$Params } from '../fn/repos/repos-get-pages';
import { reposGetPagesBuild } from '../fn/repos/repos-get-pages-build';
import { ReposGetPagesBuild$Params } from '../fn/repos/repos-get-pages-build';
import { reposGetPagesHealthCheck } from '../fn/repos/repos-get-pages-health-check';
import { ReposGetPagesHealthCheck$Params } from '../fn/repos/repos-get-pages-health-check';
import { reposGetParticipationStats } from '../fn/repos/repos-get-participation-stats';
import { ReposGetParticipationStats$Params } from '../fn/repos/repos-get-participation-stats';
import { reposGetPullRequestReviewProtection } from '../fn/repos/repos-get-pull-request-review-protection';
import { ReposGetPullRequestReviewProtection$Params } from '../fn/repos/repos-get-pull-request-review-protection';
import { reposGetPunchCardStats } from '../fn/repos/repos-get-punch-card-stats';
import { ReposGetPunchCardStats$Params } from '../fn/repos/repos-get-punch-card-stats';
import { reposGetReadme } from '../fn/repos/repos-get-readme';
import { ReposGetReadme$Params } from '../fn/repos/repos-get-readme';
import { reposGetReadmeInDirectory } from '../fn/repos/repos-get-readme-in-directory';
import { ReposGetReadmeInDirectory$Params } from '../fn/repos/repos-get-readme-in-directory';
import { reposGetRelease } from '../fn/repos/repos-get-release';
import { ReposGetRelease$Params } from '../fn/repos/repos-get-release';
import { reposGetReleaseAsset } from '../fn/repos/repos-get-release-asset';
import { ReposGetReleaseAsset$Params } from '../fn/repos/repos-get-release-asset';
import { reposGetReleaseByTag } from '../fn/repos/repos-get-release-by-tag';
import { ReposGetReleaseByTag$Params } from '../fn/repos/repos-get-release-by-tag';
import { reposGetRepoRuleset } from '../fn/repos/repos-get-repo-ruleset';
import { ReposGetRepoRuleset$Params } from '../fn/repos/repos-get-repo-ruleset';
import { reposGetRepoRulesets } from '../fn/repos/repos-get-repo-rulesets';
import { ReposGetRepoRulesets$Params } from '../fn/repos/repos-get-repo-rulesets';
import { reposGetStatusChecksProtection } from '../fn/repos/repos-get-status-checks-protection';
import { ReposGetStatusChecksProtection$Params } from '../fn/repos/repos-get-status-checks-protection';
import { reposGetTeamsWithAccessToProtectedBranch } from '../fn/repos/repos-get-teams-with-access-to-protected-branch';
import { ReposGetTeamsWithAccessToProtectedBranch$Params } from '../fn/repos/repos-get-teams-with-access-to-protected-branch';
import { reposGetTopPaths } from '../fn/repos/repos-get-top-paths';
import { ReposGetTopPaths$Params } from '../fn/repos/repos-get-top-paths';
import { reposGetTopReferrers } from '../fn/repos/repos-get-top-referrers';
import { ReposGetTopReferrers$Params } from '../fn/repos/repos-get-top-referrers';
import { reposGetUsersWithAccessToProtectedBranch } from '../fn/repos/repos-get-users-with-access-to-protected-branch';
import { ReposGetUsersWithAccessToProtectedBranch$Params } from '../fn/repos/repos-get-users-with-access-to-protected-branch';
import { reposGetViews } from '../fn/repos/repos-get-views';
import { ReposGetViews$Params } from '../fn/repos/repos-get-views';
import { reposGetWebhook } from '../fn/repos/repos-get-webhook';
import { ReposGetWebhook$Params } from '../fn/repos/repos-get-webhook';
import { reposGetWebhookConfigForRepo } from '../fn/repos/repos-get-webhook-config-for-repo';
import { ReposGetWebhookConfigForRepo$Params } from '../fn/repos/repos-get-webhook-config-for-repo';
import { reposGetWebhookDelivery } from '../fn/repos/repos-get-webhook-delivery';
import { ReposGetWebhookDelivery$Params } from '../fn/repos/repos-get-webhook-delivery';
import { Repository } from '../models/repository';
import { RepositoryCollaboratorPermission } from '../models/repository-collaborator-permission';
import { RepositoryInvitation } from '../models/repository-invitation';
import { RepositoryRuleDetailed } from '../models/repository-rule-detailed';
import { RepositoryRuleset } from '../models/repository-ruleset';
import { reposListActivities } from '../fn/repos/repos-list-activities';
import { ReposListActivities$Params } from '../fn/repos/repos-list-activities';
import { reposListAutolinks } from '../fn/repos/repos-list-autolinks';
import { ReposListAutolinks$Params } from '../fn/repos/repos-list-autolinks';
import { reposListBranches } from '../fn/repos/repos-list-branches';
import { ReposListBranches$Params } from '../fn/repos/repos-list-branches';
import { reposListBranchesForHeadCommit } from '../fn/repos/repos-list-branches-for-head-commit';
import { ReposListBranchesForHeadCommit$Params } from '../fn/repos/repos-list-branches-for-head-commit';
import { reposListCollaborators } from '../fn/repos/repos-list-collaborators';
import { ReposListCollaborators$Params } from '../fn/repos/repos-list-collaborators';
import { reposListCommentsForCommit } from '../fn/repos/repos-list-comments-for-commit';
import { ReposListCommentsForCommit$Params } from '../fn/repos/repos-list-comments-for-commit';
import { reposListCommitCommentsForRepo } from '../fn/repos/repos-list-commit-comments-for-repo';
import { ReposListCommitCommentsForRepo$Params } from '../fn/repos/repos-list-commit-comments-for-repo';
import { reposListCommits } from '../fn/repos/repos-list-commits';
import { ReposListCommits$Params } from '../fn/repos/repos-list-commits';
import { reposListCommitStatusesForRef } from '../fn/repos/repos-list-commit-statuses-for-ref';
import { ReposListCommitStatusesForRef$Params } from '../fn/repos/repos-list-commit-statuses-for-ref';
import { reposListContributors } from '../fn/repos/repos-list-contributors';
import { ReposListContributors$Params } from '../fn/repos/repos-list-contributors';
import { reposListCustomDeploymentRuleIntegrations } from '../fn/repos/repos-list-custom-deployment-rule-integrations';
import { ReposListCustomDeploymentRuleIntegrations$Params } from '../fn/repos/repos-list-custom-deployment-rule-integrations';
import { reposListDeployKeys } from '../fn/repos/repos-list-deploy-keys';
import { ReposListDeployKeys$Params } from '../fn/repos/repos-list-deploy-keys';
import { reposListDeploymentBranchPolicies } from '../fn/repos/repos-list-deployment-branch-policies';
import { ReposListDeploymentBranchPolicies$Params } from '../fn/repos/repos-list-deployment-branch-policies';
import { reposListDeployments } from '../fn/repos/repos-list-deployments';
import { ReposListDeployments$Params } from '../fn/repos/repos-list-deployments';
import { reposListDeploymentStatuses } from '../fn/repos/repos-list-deployment-statuses';
import { ReposListDeploymentStatuses$Params } from '../fn/repos/repos-list-deployment-statuses';
import { reposListForAuthenticatedUser } from '../fn/repos/repos-list-for-authenticated-user';
import { ReposListForAuthenticatedUser$Params } from '../fn/repos/repos-list-for-authenticated-user';
import { reposListForks } from '../fn/repos/repos-list-forks';
import { ReposListForks$Params } from '../fn/repos/repos-list-forks';
import { reposListForOrg } from '../fn/repos/repos-list-for-org';
import { ReposListForOrg$Params } from '../fn/repos/repos-list-for-org';
import { reposListForUser } from '../fn/repos/repos-list-for-user';
import { ReposListForUser$Params } from '../fn/repos/repos-list-for-user';
import { reposListInvitations } from '../fn/repos/repos-list-invitations';
import { ReposListInvitations$Params } from '../fn/repos/repos-list-invitations';
import { reposListInvitationsForAuthenticatedUser } from '../fn/repos/repos-list-invitations-for-authenticated-user';
import { ReposListInvitationsForAuthenticatedUser$Params } from '../fn/repos/repos-list-invitations-for-authenticated-user';
import { reposListLanguages } from '../fn/repos/repos-list-languages';
import { ReposListLanguages$Params } from '../fn/repos/repos-list-languages';
import { reposListPagesBuilds } from '../fn/repos/repos-list-pages-builds';
import { ReposListPagesBuilds$Params } from '../fn/repos/repos-list-pages-builds';
import { reposListPublic } from '../fn/repos/repos-list-public';
import { ReposListPublic$Params } from '../fn/repos/repos-list-public';
import { reposListPullRequestsAssociatedWithCommit } from '../fn/repos/repos-list-pull-requests-associated-with-commit';
import { ReposListPullRequestsAssociatedWithCommit$Params } from '../fn/repos/repos-list-pull-requests-associated-with-commit';
import { reposListReleaseAssets } from '../fn/repos/repos-list-release-assets';
import { ReposListReleaseAssets$Params } from '../fn/repos/repos-list-release-assets';
import { reposListReleases } from '../fn/repos/repos-list-releases';
import { ReposListReleases$Params } from '../fn/repos/repos-list-releases';
import { reposListTagProtection } from '../fn/repos/repos-list-tag-protection';
import { ReposListTagProtection$Params } from '../fn/repos/repos-list-tag-protection';
import { reposListTags } from '../fn/repos/repos-list-tags';
import { ReposListTags$Params } from '../fn/repos/repos-list-tags';
import { reposListTeams } from '../fn/repos/repos-list-teams';
import { ReposListTeams$Params } from '../fn/repos/repos-list-teams';
import { reposListWebhookDeliveries } from '../fn/repos/repos-list-webhook-deliveries';
import { ReposListWebhookDeliveries$Params } from '../fn/repos/repos-list-webhook-deliveries';
import { reposListWebhooks } from '../fn/repos/repos-list-webhooks';
import { ReposListWebhooks$Params } from '../fn/repos/repos-list-webhooks';
import { reposMerge } from '../fn/repos/repos-merge';
import { ReposMerge$Params } from '../fn/repos/repos-merge';
import { reposMergeUpstream } from '../fn/repos/repos-merge-upstream';
import { ReposMergeUpstream$Params } from '../fn/repos/repos-merge-upstream';
import { reposPingWebhook } from '../fn/repos/repos-ping-webhook';
import { ReposPingWebhook$Params } from '../fn/repos/repos-ping-webhook';
import { reposRedeliverWebhookDelivery } from '../fn/repos/repos-redeliver-webhook-delivery';
import { ReposRedeliverWebhookDelivery$Params } from '../fn/repos/repos-redeliver-webhook-delivery';
import { reposRemoveAppAccessRestrictions } from '../fn/repos/repos-remove-app-access-restrictions';
import { ReposRemoveAppAccessRestrictions$Params } from '../fn/repos/repos-remove-app-access-restrictions';
import { reposRemoveCollaborator } from '../fn/repos/repos-remove-collaborator';
import { ReposRemoveCollaborator$Params } from '../fn/repos/repos-remove-collaborator';
import { reposRemoveStatusCheckContexts } from '../fn/repos/repos-remove-status-check-contexts';
import { ReposRemoveStatusCheckContexts$Params } from '../fn/repos/repos-remove-status-check-contexts';
import { reposRemoveStatusCheckProtection } from '../fn/repos/repos-remove-status-check-protection';
import { ReposRemoveStatusCheckProtection$Params } from '../fn/repos/repos-remove-status-check-protection';
import { reposRemoveTeamAccessRestrictions } from '../fn/repos/repos-remove-team-access-restrictions';
import { ReposRemoveTeamAccessRestrictions$Params } from '../fn/repos/repos-remove-team-access-restrictions';
import { reposRemoveUserAccessRestrictions } from '../fn/repos/repos-remove-user-access-restrictions';
import { ReposRemoveUserAccessRestrictions$Params } from '../fn/repos/repos-remove-user-access-restrictions';
import { reposRenameBranch } from '../fn/repos/repos-rename-branch';
import { ReposRenameBranch$Params } from '../fn/repos/repos-rename-branch';
import { reposReplaceAllTopics } from '../fn/repos/repos-replace-all-topics';
import { ReposReplaceAllTopics$Params } from '../fn/repos/repos-replace-all-topics';
import { reposRequestPagesBuild } from '../fn/repos/repos-request-pages-build';
import { ReposRequestPagesBuild$Params } from '../fn/repos/repos-request-pages-build';
import { reposSetAdminBranchProtection } from '../fn/repos/repos-set-admin-branch-protection';
import { ReposSetAdminBranchProtection$Params } from '../fn/repos/repos-set-admin-branch-protection';
import { reposSetAppAccessRestrictions } from '../fn/repos/repos-set-app-access-restrictions';
import { ReposSetAppAccessRestrictions$Params } from '../fn/repos/repos-set-app-access-restrictions';
import { reposSetStatusCheckContexts } from '../fn/repos/repos-set-status-check-contexts';
import { ReposSetStatusCheckContexts$Params } from '../fn/repos/repos-set-status-check-contexts';
import { reposSetTeamAccessRestrictions } from '../fn/repos/repos-set-team-access-restrictions';
import { ReposSetTeamAccessRestrictions$Params } from '../fn/repos/repos-set-team-access-restrictions';
import { reposSetUserAccessRestrictions } from '../fn/repos/repos-set-user-access-restrictions';
import { ReposSetUserAccessRestrictions$Params } from '../fn/repos/repos-set-user-access-restrictions';
import { reposTestPushWebhook } from '../fn/repos/repos-test-push-webhook';
import { ReposTestPushWebhook$Params } from '../fn/repos/repos-test-push-webhook';
import { reposTransfer } from '../fn/repos/repos-transfer';
import { ReposTransfer$Params } from '../fn/repos/repos-transfer';
import { reposUpdate } from '../fn/repos/repos-update';
import { ReposUpdate$Params } from '../fn/repos/repos-update';
import { reposUpdateBranchProtection } from '../fn/repos/repos-update-branch-protection';
import { ReposUpdateBranchProtection$Params } from '../fn/repos/repos-update-branch-protection';
import { reposUpdateCommitComment } from '../fn/repos/repos-update-commit-comment';
import { ReposUpdateCommitComment$Params } from '../fn/repos/repos-update-commit-comment';
import { reposUpdateDeploymentBranchPolicy } from '../fn/repos/repos-update-deployment-branch-policy';
import { ReposUpdateDeploymentBranchPolicy$Params } from '../fn/repos/repos-update-deployment-branch-policy';
import { reposUpdateInformationAboutPagesSite } from '../fn/repos/repos-update-information-about-pages-site';
import { ReposUpdateInformationAboutPagesSite$Params } from '../fn/repos/repos-update-information-about-pages-site';
import { reposUpdateInvitation } from '../fn/repos/repos-update-invitation';
import { ReposUpdateInvitation$Params } from '../fn/repos/repos-update-invitation';
import { reposUpdateOrgRuleset } from '../fn/repos/repos-update-org-ruleset';
import { ReposUpdateOrgRuleset$Params } from '../fn/repos/repos-update-org-ruleset';
import { reposUpdatePullRequestReviewProtection } from '../fn/repos/repos-update-pull-request-review-protection';
import { ReposUpdatePullRequestReviewProtection$Params } from '../fn/repos/repos-update-pull-request-review-protection';
import { reposUpdateRelease } from '../fn/repos/repos-update-release';
import { ReposUpdateRelease$Params } from '../fn/repos/repos-update-release';
import { reposUpdateReleaseAsset } from '../fn/repos/repos-update-release-asset';
import { ReposUpdateReleaseAsset$Params } from '../fn/repos/repos-update-release-asset';
import { reposUpdateRepoRuleset } from '../fn/repos/repos-update-repo-ruleset';
import { ReposUpdateRepoRuleset$Params } from '../fn/repos/repos-update-repo-ruleset';
import { reposUpdateStatusCheckProtection } from '../fn/repos/repos-update-status-check-protection';
import { ReposUpdateStatusCheckProtection$Params } from '../fn/repos/repos-update-status-check-protection';
import { reposUpdateWebhook } from '../fn/repos/repos-update-webhook';
import { ReposUpdateWebhook$Params } from '../fn/repos/repos-update-webhook';
import { reposUpdateWebhookConfigForRepo } from '../fn/repos/repos-update-webhook-config-for-repo';
import { ReposUpdateWebhookConfigForRepo$Params } from '../fn/repos/repos-update-webhook-config-for-repo';
import { reposUploadReleaseAsset } from '../fn/repos/repos-upload-release-asset';
import { ReposUploadReleaseAsset$Params } from '../fn/repos/repos-upload-release-asset';
import { ShortBranch } from '../models/short-branch';
import { SimpleUser } from '../models/simple-user';
import { Status } from '../models/status';
import { StatusCheckPolicy } from '../models/status-check-policy';
import { Tag } from '../models/tag';
import { TagProtection } from '../models/tag-protection';
import { Team } from '../models/team';
import { Topic } from '../models/topic';
import { ViewTraffic } from '../models/view-traffic';
import { WebhookConfig } from '../models/webhook-config';


/**
 * Interact with GitHub Repos.
 */
@Injectable({ providedIn: 'root' })
export class ReposService extends BaseService {
  constructor(config: ApiConfiguration, http: HttpClient) {
    super(config, http);
  }

  /** Path part for operation `reposListForOrg()` */
  static readonly ReposListForOrgPath = '/orgs/{org}/repos';

  /**
   * List organization repositories.
   *
   * Lists repositories for the specified organization.
   *
   * **Note:** In order to see the `security_and_analysis` block for a repository you must have admin permissions for the repository or be an owner or security manager for the organization that owns the repository. For more information, see "[Managing security managers in your organization](https://docs.github.com/organizations/managing-peoples-access-to-your-organization-with-roles/managing-security-managers-in-your-organization)."
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposListForOrg()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposListForOrg$Response(params: ReposListForOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<MinimalRepository>>> {
    return reposListForOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * List organization repositories.
   *
   * Lists repositories for the specified organization.
   *
   * **Note:** In order to see the `security_and_analysis` block for a repository you must have admin permissions for the repository or be an owner or security manager for the organization that owns the repository. For more information, see "[Managing security managers in your organization](https://docs.github.com/organizations/managing-peoples-access-to-your-organization-with-roles/managing-security-managers-in-your-organization)."
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposListForOrg$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposListForOrg(params: ReposListForOrg$Params, context?: HttpContext): Observable<Array<MinimalRepository>> {
    return this.reposListForOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<MinimalRepository>>): Array<MinimalRepository> => r.body)
    );
  }

  /** Path part for operation `reposCreateInOrg()` */
  static readonly ReposCreateInOrgPath = '/orgs/{org}/repos';

  /**
   * Create an organization repository.
   *
   * Creates a new repository in the specified organization. The authenticated user must be a member of the organization.
   *
   * **OAuth scope requirements**
   *
   * When using [OAuth](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/), authorizations must include:
   *
   * *   `public_repo` scope or `repo` scope to create a public repository. Note: For GitHub AE, use `repo` scope to create an internal repository.
   * *   `repo` scope to create a private repository
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposCreateInOrg()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposCreateInOrg$Response(params: ReposCreateInOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<Repository>> {
    return reposCreateInOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * Create an organization repository.
   *
   * Creates a new repository in the specified organization. The authenticated user must be a member of the organization.
   *
   * **OAuth scope requirements**
   *
   * When using [OAuth](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/), authorizations must include:
   *
   * *   `public_repo` scope or `repo` scope to create a public repository. Note: For GitHub AE, use `repo` scope to create an internal repository.
   * *   `repo` scope to create a private repository
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposCreateInOrg$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposCreateInOrg(params: ReposCreateInOrg$Params, context?: HttpContext): Observable<Repository> {
    return this.reposCreateInOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<Repository>): Repository => r.body)
    );
  }

  /** Path part for operation `reposGetOrgRulesets()` */
  static readonly ReposGetOrgRulesetsPath = '/orgs/{org}/rulesets';

  /**
   * Get all organization repository rulesets.
   *
   * Get all the repository rulesets for an organization.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposGetOrgRulesets()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetOrgRulesets$Response(params: ReposGetOrgRulesets$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<RepositoryRuleset>>> {
    return reposGetOrgRulesets(this.http, this.rootUrl, params, context);
  }

  /**
   * Get all organization repository rulesets.
   *
   * Get all the repository rulesets for an organization.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposGetOrgRulesets$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetOrgRulesets(params: ReposGetOrgRulesets$Params, context?: HttpContext): Observable<Array<RepositoryRuleset>> {
    return this.reposGetOrgRulesets$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<RepositoryRuleset>>): Array<RepositoryRuleset> => r.body)
    );
  }

  /** Path part for operation `reposCreateOrgRuleset()` */
  static readonly ReposCreateOrgRulesetPath = '/orgs/{org}/rulesets';

  /**
   * Create an organization repository ruleset.
   *
   * Create a repository ruleset for an organization.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposCreateOrgRuleset()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposCreateOrgRuleset$Response(params: ReposCreateOrgRuleset$Params, context?: HttpContext): Observable<StrictHttpResponse<RepositoryRuleset>> {
    return reposCreateOrgRuleset(this.http, this.rootUrl, params, context);
  }

  /**
   * Create an organization repository ruleset.
   *
   * Create a repository ruleset for an organization.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposCreateOrgRuleset$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposCreateOrgRuleset(params: ReposCreateOrgRuleset$Params, context?: HttpContext): Observable<RepositoryRuleset> {
    return this.reposCreateOrgRuleset$Response(params, context).pipe(
      map((r: StrictHttpResponse<RepositoryRuleset>): RepositoryRuleset => r.body)
    );
  }

  /** Path part for operation `reposGetOrgRuleset()` */
  static readonly ReposGetOrgRulesetPath = '/orgs/{org}/rulesets/{ruleset_id}';

  /**
   * Get an organization repository ruleset.
   *
   * Get a repository ruleset for an organization.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposGetOrgRuleset()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetOrgRuleset$Response(params: ReposGetOrgRuleset$Params, context?: HttpContext): Observable<StrictHttpResponse<RepositoryRuleset>> {
    return reposGetOrgRuleset(this.http, this.rootUrl, params, context);
  }

  /**
   * Get an organization repository ruleset.
   *
   * Get a repository ruleset for an organization.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposGetOrgRuleset$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetOrgRuleset(params: ReposGetOrgRuleset$Params, context?: HttpContext): Observable<RepositoryRuleset> {
    return this.reposGetOrgRuleset$Response(params, context).pipe(
      map((r: StrictHttpResponse<RepositoryRuleset>): RepositoryRuleset => r.body)
    );
  }

  /** Path part for operation `reposUpdateOrgRuleset()` */
  static readonly ReposUpdateOrgRulesetPath = '/orgs/{org}/rulesets/{ruleset_id}';

  /**
   * Update an organization repository ruleset.
   *
   * Update a ruleset for an organization.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposUpdateOrgRuleset()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposUpdateOrgRuleset$Response(params: ReposUpdateOrgRuleset$Params, context?: HttpContext): Observable<StrictHttpResponse<RepositoryRuleset>> {
    return reposUpdateOrgRuleset(this.http, this.rootUrl, params, context);
  }

  /**
   * Update an organization repository ruleset.
   *
   * Update a ruleset for an organization.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposUpdateOrgRuleset$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposUpdateOrgRuleset(params: ReposUpdateOrgRuleset$Params, context?: HttpContext): Observable<RepositoryRuleset> {
    return this.reposUpdateOrgRuleset$Response(params, context).pipe(
      map((r: StrictHttpResponse<RepositoryRuleset>): RepositoryRuleset => r.body)
    );
  }

  /** Path part for operation `reposDeleteOrgRuleset()` */
  static readonly ReposDeleteOrgRulesetPath = '/orgs/{org}/rulesets/{ruleset_id}';

  /**
   * Delete an organization repository ruleset.
   *
   * Delete a ruleset for an organization.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposDeleteOrgRuleset()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposDeleteOrgRuleset$Response(params: ReposDeleteOrgRuleset$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return reposDeleteOrgRuleset(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete an organization repository ruleset.
   *
   * Delete a ruleset for an organization.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposDeleteOrgRuleset$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposDeleteOrgRuleset(params: ReposDeleteOrgRuleset$Params, context?: HttpContext): Observable<void> {
    return this.reposDeleteOrgRuleset$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `reposGet()` */
  static readonly ReposGetPath = '/repos/{owner}/{repo}';

  /**
   * Get a repository.
   *
   * The `parent` and `source` objects are present when the repository is a fork. `parent` is the repository this repository was forked from, `source` is the ultimate source for the network.
   *
   * **Note:** In order to see the `security_and_analysis` block for a repository you must have admin permissions for the repository or be an owner or security manager for the organization that owns the repository. For more information, see "[Managing security managers in your organization](https://docs.github.com/organizations/managing-peoples-access-to-your-organization-with-roles/managing-security-managers-in-your-organization)."
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposGet()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGet$Response(params: ReposGet$Params, context?: HttpContext): Observable<StrictHttpResponse<FullRepository>> {
    return reposGet(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a repository.
   *
   * The `parent` and `source` objects are present when the repository is a fork. `parent` is the repository this repository was forked from, `source` is the ultimate source for the network.
   *
   * **Note:** In order to see the `security_and_analysis` block for a repository you must have admin permissions for the repository or be an owner or security manager for the organization that owns the repository. For more information, see "[Managing security managers in your organization](https://docs.github.com/organizations/managing-peoples-access-to-your-organization-with-roles/managing-security-managers-in-your-organization)."
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposGet$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGet(params: ReposGet$Params, context?: HttpContext): Observable<FullRepository> {
    return this.reposGet$Response(params, context).pipe(
      map((r: StrictHttpResponse<FullRepository>): FullRepository => r.body)
    );
  }

  /** Path part for operation `reposDelete()` */
  static readonly ReposDeletePath = '/repos/{owner}/{repo}';

  /**
   * Delete a repository.
   *
   * Deleting a repository requires admin access. If OAuth is used, the `delete_repo` scope is required.
   *
   * If an organization owner has configured the organization to prevent members from deleting organization-owned
   * repositories, you will get a `403 Forbidden` response.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposDelete()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposDelete$Response(params: ReposDelete$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return reposDelete(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete a repository.
   *
   * Deleting a repository requires admin access. If OAuth is used, the `delete_repo` scope is required.
   *
   * If an organization owner has configured the organization to prevent members from deleting organization-owned
   * repositories, you will get a `403 Forbidden` response.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposDelete$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposDelete(params: ReposDelete$Params, context?: HttpContext): Observable<void> {
    return this.reposDelete$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `reposUpdate()` */
  static readonly ReposUpdatePath = '/repos/{owner}/{repo}';

  /**
   * Update a repository.
   *
   * **Note**: To edit a repository's topics, use the [Replace all repository topics](https://docs.github.com/rest/repos/repos#replace-all-repository-topics) endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposUpdate()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposUpdate$Response(params: ReposUpdate$Params, context?: HttpContext): Observable<StrictHttpResponse<FullRepository>> {
    return reposUpdate(this.http, this.rootUrl, params, context);
  }

  /**
   * Update a repository.
   *
   * **Note**: To edit a repository's topics, use the [Replace all repository topics](https://docs.github.com/rest/repos/repos#replace-all-repository-topics) endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposUpdate$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposUpdate(params: ReposUpdate$Params, context?: HttpContext): Observable<FullRepository> {
    return this.reposUpdate$Response(params, context).pipe(
      map((r: StrictHttpResponse<FullRepository>): FullRepository => r.body)
    );
  }

  /** Path part for operation `reposListActivities()` */
  static readonly ReposListActivitiesPath = '/repos/{owner}/{repo}/activity';

  /**
   * List repository activities.
   *
   * Lists a detailed history of changes to a repository, such as pushes, merges, force pushes, and branch changes, and associates these changes with commits and users.
   *
   * For more information about viewing repository activity,
   * see "[Viewing repository activity](https://docs.github.com/repositories/viewing-activity-and-data-for-your-repository/viewing-repository-activity)."
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposListActivities()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposListActivities$Response(params: ReposListActivities$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Activity>>> {
    return reposListActivities(this.http, this.rootUrl, params, context);
  }

  /**
   * List repository activities.
   *
   * Lists a detailed history of changes to a repository, such as pushes, merges, force pushes, and branch changes, and associates these changes with commits and users.
   *
   * For more information about viewing repository activity,
   * see "[Viewing repository activity](https://docs.github.com/repositories/viewing-activity-and-data-for-your-repository/viewing-repository-activity)."
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposListActivities$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposListActivities(params: ReposListActivities$Params, context?: HttpContext): Observable<Array<Activity>> {
    return this.reposListActivities$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Activity>>): Array<Activity> => r.body)
    );
  }

  /** Path part for operation `reposListAutolinks()` */
  static readonly ReposListAutolinksPath = '/repos/{owner}/{repo}/autolinks';

  /**
   * List all autolinks of a repository.
   *
   * This returns a list of autolinks configured for the given repository.
   *
   * Information about autolinks are only available to repository administrators.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposListAutolinks()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposListAutolinks$Response(params: ReposListAutolinks$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Autolink>>> {
    return reposListAutolinks(this.http, this.rootUrl, params, context);
  }

  /**
   * List all autolinks of a repository.
   *
   * This returns a list of autolinks configured for the given repository.
   *
   * Information about autolinks are only available to repository administrators.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposListAutolinks$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposListAutolinks(params: ReposListAutolinks$Params, context?: HttpContext): Observable<Array<Autolink>> {
    return this.reposListAutolinks$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Autolink>>): Array<Autolink> => r.body)
    );
  }

  /** Path part for operation `reposCreateAutolink()` */
  static readonly ReposCreateAutolinkPath = '/repos/{owner}/{repo}/autolinks';

  /**
   * Create an autolink reference for a repository.
   *
   * Users with admin access to the repository can create an autolink.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposCreateAutolink()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposCreateAutolink$Response(params: ReposCreateAutolink$Params, context?: HttpContext): Observable<StrictHttpResponse<Autolink>> {
    return reposCreateAutolink(this.http, this.rootUrl, params, context);
  }

  /**
   * Create an autolink reference for a repository.
   *
   * Users with admin access to the repository can create an autolink.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposCreateAutolink$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposCreateAutolink(params: ReposCreateAutolink$Params, context?: HttpContext): Observable<Autolink> {
    return this.reposCreateAutolink$Response(params, context).pipe(
      map((r: StrictHttpResponse<Autolink>): Autolink => r.body)
    );
  }

  /** Path part for operation `reposGetAutolink()` */
  static readonly ReposGetAutolinkPath = '/repos/{owner}/{repo}/autolinks/{autolink_id}';

  /**
   * Get an autolink reference of a repository.
   *
   * This returns a single autolink reference by ID that was configured for the given repository.
   *
   * Information about autolinks are only available to repository administrators.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposGetAutolink()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetAutolink$Response(params: ReposGetAutolink$Params, context?: HttpContext): Observable<StrictHttpResponse<Autolink>> {
    return reposGetAutolink(this.http, this.rootUrl, params, context);
  }

  /**
   * Get an autolink reference of a repository.
   *
   * This returns a single autolink reference by ID that was configured for the given repository.
   *
   * Information about autolinks are only available to repository administrators.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposGetAutolink$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetAutolink(params: ReposGetAutolink$Params, context?: HttpContext): Observable<Autolink> {
    return this.reposGetAutolink$Response(params, context).pipe(
      map((r: StrictHttpResponse<Autolink>): Autolink => r.body)
    );
  }

  /** Path part for operation `reposDeleteAutolink()` */
  static readonly ReposDeleteAutolinkPath = '/repos/{owner}/{repo}/autolinks/{autolink_id}';

  /**
   * Delete an autolink reference from a repository.
   *
   * This deletes a single autolink reference by ID that was configured for the given repository.
   *
   * Information about autolinks are only available to repository administrators.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposDeleteAutolink()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposDeleteAutolink$Response(params: ReposDeleteAutolink$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return reposDeleteAutolink(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete an autolink reference from a repository.
   *
   * This deletes a single autolink reference by ID that was configured for the given repository.
   *
   * Information about autolinks are only available to repository administrators.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposDeleteAutolink$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposDeleteAutolink(params: ReposDeleteAutolink$Params, context?: HttpContext): Observable<void> {
    return this.reposDeleteAutolink$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `reposCheckAutomatedSecurityFixes()` */
  static readonly ReposCheckAutomatedSecurityFixesPath = '/repos/{owner}/{repo}/automated-security-fixes';

  /**
   * Check if automated security fixes are enabled for a repository.
   *
   * Shows whether automated security fixes are enabled, disabled or paused for a repository. The authenticated user must have admin read access to the repository. For more information, see "[Configuring automated security fixes](https://docs.github.com/articles/configuring-automated-security-fixes)".
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposCheckAutomatedSecurityFixes()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposCheckAutomatedSecurityFixes$Response(params: ReposCheckAutomatedSecurityFixes$Params, context?: HttpContext): Observable<StrictHttpResponse<CheckAutomatedSecurityFixes>> {
    return reposCheckAutomatedSecurityFixes(this.http, this.rootUrl, params, context);
  }

  /**
   * Check if automated security fixes are enabled for a repository.
   *
   * Shows whether automated security fixes are enabled, disabled or paused for a repository. The authenticated user must have admin read access to the repository. For more information, see "[Configuring automated security fixes](https://docs.github.com/articles/configuring-automated-security-fixes)".
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposCheckAutomatedSecurityFixes$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposCheckAutomatedSecurityFixes(params: ReposCheckAutomatedSecurityFixes$Params, context?: HttpContext): Observable<CheckAutomatedSecurityFixes> {
    return this.reposCheckAutomatedSecurityFixes$Response(params, context).pipe(
      map((r: StrictHttpResponse<CheckAutomatedSecurityFixes>): CheckAutomatedSecurityFixes => r.body)
    );
  }

  /** Path part for operation `reposEnableAutomatedSecurityFixes()` */
  static readonly ReposEnableAutomatedSecurityFixesPath = '/repos/{owner}/{repo}/automated-security-fixes';

  /**
   * Enable automated security fixes.
   *
   * Enables automated security fixes for a repository. The authenticated user must have admin access to the repository. For more information, see "[Configuring automated security fixes](https://docs.github.com/articles/configuring-automated-security-fixes)".
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposEnableAutomatedSecurityFixes()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposEnableAutomatedSecurityFixes$Response(params: ReposEnableAutomatedSecurityFixes$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return reposEnableAutomatedSecurityFixes(this.http, this.rootUrl, params, context);
  }

  /**
   * Enable automated security fixes.
   *
   * Enables automated security fixes for a repository. The authenticated user must have admin access to the repository. For more information, see "[Configuring automated security fixes](https://docs.github.com/articles/configuring-automated-security-fixes)".
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposEnableAutomatedSecurityFixes$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposEnableAutomatedSecurityFixes(params: ReposEnableAutomatedSecurityFixes$Params, context?: HttpContext): Observable<void> {
    return this.reposEnableAutomatedSecurityFixes$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `reposDisableAutomatedSecurityFixes()` */
  static readonly ReposDisableAutomatedSecurityFixesPath = '/repos/{owner}/{repo}/automated-security-fixes';

  /**
   * Disable automated security fixes.
   *
   * Disables automated security fixes for a repository. The authenticated user must have admin access to the repository. For more information, see "[Configuring automated security fixes](https://docs.github.com/articles/configuring-automated-security-fixes)".
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposDisableAutomatedSecurityFixes()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposDisableAutomatedSecurityFixes$Response(params: ReposDisableAutomatedSecurityFixes$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return reposDisableAutomatedSecurityFixes(this.http, this.rootUrl, params, context);
  }

  /**
   * Disable automated security fixes.
   *
   * Disables automated security fixes for a repository. The authenticated user must have admin access to the repository. For more information, see "[Configuring automated security fixes](https://docs.github.com/articles/configuring-automated-security-fixes)".
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposDisableAutomatedSecurityFixes$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposDisableAutomatedSecurityFixes(params: ReposDisableAutomatedSecurityFixes$Params, context?: HttpContext): Observable<void> {
    return this.reposDisableAutomatedSecurityFixes$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `reposListBranches()` */
  static readonly ReposListBranchesPath = '/repos/{owner}/{repo}/branches';

  /**
   * List branches.
   *
   *
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposListBranches()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposListBranches$Response(params: ReposListBranches$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<ShortBranch>>> {
    return reposListBranches(this.http, this.rootUrl, params, context);
  }

  /**
   * List branches.
   *
   *
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposListBranches$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposListBranches(params: ReposListBranches$Params, context?: HttpContext): Observable<Array<ShortBranch>> {
    return this.reposListBranches$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<ShortBranch>>): Array<ShortBranch> => r.body)
    );
  }

  /** Path part for operation `reposGetBranch()` */
  static readonly ReposGetBranchPath = '/repos/{owner}/{repo}/branches/{branch}';

  /**
   * Get a branch.
   *
   *
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposGetBranch()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetBranch$Response(params: ReposGetBranch$Params, context?: HttpContext): Observable<StrictHttpResponse<BranchWithProtection>> {
    return reposGetBranch(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a branch.
   *
   *
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposGetBranch$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetBranch(params: ReposGetBranch$Params, context?: HttpContext): Observable<BranchWithProtection> {
    return this.reposGetBranch$Response(params, context).pipe(
      map((r: StrictHttpResponse<BranchWithProtection>): BranchWithProtection => r.body)
    );
  }

  /** Path part for operation `reposGetBranchProtection()` */
  static readonly ReposGetBranchProtectionPath = '/repos/{owner}/{repo}/branches/{branch}/protection';

  /**
   * Get branch protection.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposGetBranchProtection()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetBranchProtection$Response(params: ReposGetBranchProtection$Params, context?: HttpContext): Observable<StrictHttpResponse<BranchProtection>> {
    return reposGetBranchProtection(this.http, this.rootUrl, params, context);
  }

  /**
   * Get branch protection.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposGetBranchProtection$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetBranchProtection(params: ReposGetBranchProtection$Params, context?: HttpContext): Observable<BranchProtection> {
    return this.reposGetBranchProtection$Response(params, context).pipe(
      map((r: StrictHttpResponse<BranchProtection>): BranchProtection => r.body)
    );
  }

  /** Path part for operation `reposUpdateBranchProtection()` */
  static readonly ReposUpdateBranchProtectionPath = '/repos/{owner}/{repo}/branches/{branch}/protection';

  /**
   * Update branch protection.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * Protecting a branch requires admin or owner permissions to the repository.
   *
   * **Note**: Passing new arrays of `users` and `teams` replaces their previous values.
   *
   * **Note**: The list of users, apps, and teams in total is limited to 100 items.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposUpdateBranchProtection()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposUpdateBranchProtection$Response(params: ReposUpdateBranchProtection$Params, context?: HttpContext): Observable<StrictHttpResponse<ProtectedBranch>> {
    return reposUpdateBranchProtection(this.http, this.rootUrl, params, context);
  }

  /**
   * Update branch protection.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * Protecting a branch requires admin or owner permissions to the repository.
   *
   * **Note**: Passing new arrays of `users` and `teams` replaces their previous values.
   *
   * **Note**: The list of users, apps, and teams in total is limited to 100 items.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposUpdateBranchProtection$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposUpdateBranchProtection(params: ReposUpdateBranchProtection$Params, context?: HttpContext): Observable<ProtectedBranch> {
    return this.reposUpdateBranchProtection$Response(params, context).pipe(
      map((r: StrictHttpResponse<ProtectedBranch>): ProtectedBranch => r.body)
    );
  }

  /** Path part for operation `reposDeleteBranchProtection()` */
  static readonly ReposDeleteBranchProtectionPath = '/repos/{owner}/{repo}/branches/{branch}/protection';

  /**
   * Delete branch protection.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposDeleteBranchProtection()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposDeleteBranchProtection$Response(params: ReposDeleteBranchProtection$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return reposDeleteBranchProtection(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete branch protection.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposDeleteBranchProtection$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposDeleteBranchProtection(params: ReposDeleteBranchProtection$Params, context?: HttpContext): Observable<void> {
    return this.reposDeleteBranchProtection$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `reposGetAdminBranchProtection()` */
  static readonly ReposGetAdminBranchProtectionPath = '/repos/{owner}/{repo}/branches/{branch}/protection/enforce_admins';

  /**
   * Get admin branch protection.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposGetAdminBranchProtection()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetAdminBranchProtection$Response(params: ReposGetAdminBranchProtection$Params, context?: HttpContext): Observable<StrictHttpResponse<ProtectedBranchAdminEnforced>> {
    return reposGetAdminBranchProtection(this.http, this.rootUrl, params, context);
  }

  /**
   * Get admin branch protection.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposGetAdminBranchProtection$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetAdminBranchProtection(params: ReposGetAdminBranchProtection$Params, context?: HttpContext): Observable<ProtectedBranchAdminEnforced> {
    return this.reposGetAdminBranchProtection$Response(params, context).pipe(
      map((r: StrictHttpResponse<ProtectedBranchAdminEnforced>): ProtectedBranchAdminEnforced => r.body)
    );
  }

  /** Path part for operation `reposSetAdminBranchProtection()` */
  static readonly ReposSetAdminBranchProtectionPath = '/repos/{owner}/{repo}/branches/{branch}/protection/enforce_admins';

  /**
   * Set admin branch protection.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * Adding admin enforcement requires admin or owner permissions to the repository and branch protection to be enabled.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposSetAdminBranchProtection()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposSetAdminBranchProtection$Response(params: ReposSetAdminBranchProtection$Params, context?: HttpContext): Observable<StrictHttpResponse<ProtectedBranchAdminEnforced>> {
    return reposSetAdminBranchProtection(this.http, this.rootUrl, params, context);
  }

  /**
   * Set admin branch protection.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * Adding admin enforcement requires admin or owner permissions to the repository and branch protection to be enabled.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposSetAdminBranchProtection$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposSetAdminBranchProtection(params: ReposSetAdminBranchProtection$Params, context?: HttpContext): Observable<ProtectedBranchAdminEnforced> {
    return this.reposSetAdminBranchProtection$Response(params, context).pipe(
      map((r: StrictHttpResponse<ProtectedBranchAdminEnforced>): ProtectedBranchAdminEnforced => r.body)
    );
  }

  /** Path part for operation `reposDeleteAdminBranchProtection()` */
  static readonly ReposDeleteAdminBranchProtectionPath = '/repos/{owner}/{repo}/branches/{branch}/protection/enforce_admins';

  /**
   * Delete admin branch protection.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * Removing admin enforcement requires admin or owner permissions to the repository and branch protection to be enabled.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposDeleteAdminBranchProtection()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposDeleteAdminBranchProtection$Response(params: ReposDeleteAdminBranchProtection$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return reposDeleteAdminBranchProtection(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete admin branch protection.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * Removing admin enforcement requires admin or owner permissions to the repository and branch protection to be enabled.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposDeleteAdminBranchProtection$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposDeleteAdminBranchProtection(params: ReposDeleteAdminBranchProtection$Params, context?: HttpContext): Observable<void> {
    return this.reposDeleteAdminBranchProtection$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `reposGetPullRequestReviewProtection()` */
  static readonly ReposGetPullRequestReviewProtectionPath = '/repos/{owner}/{repo}/branches/{branch}/protection/required_pull_request_reviews';

  /**
   * Get pull request review protection.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposGetPullRequestReviewProtection()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetPullRequestReviewProtection$Response(params: ReposGetPullRequestReviewProtection$Params, context?: HttpContext): Observable<StrictHttpResponse<ProtectedBranchPullRequestReview>> {
    return reposGetPullRequestReviewProtection(this.http, this.rootUrl, params, context);
  }

  /**
   * Get pull request review protection.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposGetPullRequestReviewProtection$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetPullRequestReviewProtection(params: ReposGetPullRequestReviewProtection$Params, context?: HttpContext): Observable<ProtectedBranchPullRequestReview> {
    return this.reposGetPullRequestReviewProtection$Response(params, context).pipe(
      map((r: StrictHttpResponse<ProtectedBranchPullRequestReview>): ProtectedBranchPullRequestReview => r.body)
    );
  }

  /** Path part for operation `reposDeletePullRequestReviewProtection()` */
  static readonly ReposDeletePullRequestReviewProtectionPath = '/repos/{owner}/{repo}/branches/{branch}/protection/required_pull_request_reviews';

  /**
   * Delete pull request review protection.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposDeletePullRequestReviewProtection()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposDeletePullRequestReviewProtection$Response(params: ReposDeletePullRequestReviewProtection$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return reposDeletePullRequestReviewProtection(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete pull request review protection.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposDeletePullRequestReviewProtection$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposDeletePullRequestReviewProtection(params: ReposDeletePullRequestReviewProtection$Params, context?: HttpContext): Observable<void> {
    return this.reposDeletePullRequestReviewProtection$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `reposUpdatePullRequestReviewProtection()` */
  static readonly ReposUpdatePullRequestReviewProtectionPath = '/repos/{owner}/{repo}/branches/{branch}/protection/required_pull_request_reviews';

  /**
   * Update pull request review protection.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * Updating pull request review enforcement requires admin or owner permissions to the repository and branch protection to be enabled.
   *
   * **Note**: Passing new arrays of `users` and `teams` replaces their previous values.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposUpdatePullRequestReviewProtection()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposUpdatePullRequestReviewProtection$Response(params: ReposUpdatePullRequestReviewProtection$Params, context?: HttpContext): Observable<StrictHttpResponse<ProtectedBranchPullRequestReview>> {
    return reposUpdatePullRequestReviewProtection(this.http, this.rootUrl, params, context);
  }

  /**
   * Update pull request review protection.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * Updating pull request review enforcement requires admin or owner permissions to the repository and branch protection to be enabled.
   *
   * **Note**: Passing new arrays of `users` and `teams` replaces their previous values.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposUpdatePullRequestReviewProtection$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposUpdatePullRequestReviewProtection(params: ReposUpdatePullRequestReviewProtection$Params, context?: HttpContext): Observable<ProtectedBranchPullRequestReview> {
    return this.reposUpdatePullRequestReviewProtection$Response(params, context).pipe(
      map((r: StrictHttpResponse<ProtectedBranchPullRequestReview>): ProtectedBranchPullRequestReview => r.body)
    );
  }

  /** Path part for operation `reposGetCommitSignatureProtection()` */
  static readonly ReposGetCommitSignatureProtectionPath = '/repos/{owner}/{repo}/branches/{branch}/protection/required_signatures';

  /**
   * Get commit signature protection.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * When authenticated with admin or owner permissions to the repository, you can use this endpoint to check whether a branch requires signed commits. An enabled status of `true` indicates you must sign commits on this branch. For more information, see [Signing commits with GPG](https://docs.github.com/articles/signing-commits-with-gpg) in GitHub Help.
   *
   * **Note**: You must enable branch protection to require signed commits.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposGetCommitSignatureProtection()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetCommitSignatureProtection$Response(params: ReposGetCommitSignatureProtection$Params, context?: HttpContext): Observable<StrictHttpResponse<ProtectedBranchAdminEnforced>> {
    return reposGetCommitSignatureProtection(this.http, this.rootUrl, params, context);
  }

  /**
   * Get commit signature protection.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * When authenticated with admin or owner permissions to the repository, you can use this endpoint to check whether a branch requires signed commits. An enabled status of `true` indicates you must sign commits on this branch. For more information, see [Signing commits with GPG](https://docs.github.com/articles/signing-commits-with-gpg) in GitHub Help.
   *
   * **Note**: You must enable branch protection to require signed commits.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposGetCommitSignatureProtection$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetCommitSignatureProtection(params: ReposGetCommitSignatureProtection$Params, context?: HttpContext): Observable<ProtectedBranchAdminEnforced> {
    return this.reposGetCommitSignatureProtection$Response(params, context).pipe(
      map((r: StrictHttpResponse<ProtectedBranchAdminEnforced>): ProtectedBranchAdminEnforced => r.body)
    );
  }

  /** Path part for operation `reposCreateCommitSignatureProtection()` */
  static readonly ReposCreateCommitSignatureProtectionPath = '/repos/{owner}/{repo}/branches/{branch}/protection/required_signatures';

  /**
   * Create commit signature protection.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * When authenticated with admin or owner permissions to the repository, you can use this endpoint to require signed commits on a branch. You must enable branch protection to require signed commits.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposCreateCommitSignatureProtection()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposCreateCommitSignatureProtection$Response(params: ReposCreateCommitSignatureProtection$Params, context?: HttpContext): Observable<StrictHttpResponse<ProtectedBranchAdminEnforced>> {
    return reposCreateCommitSignatureProtection(this.http, this.rootUrl, params, context);
  }

  /**
   * Create commit signature protection.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * When authenticated with admin or owner permissions to the repository, you can use this endpoint to require signed commits on a branch. You must enable branch protection to require signed commits.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposCreateCommitSignatureProtection$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposCreateCommitSignatureProtection(params: ReposCreateCommitSignatureProtection$Params, context?: HttpContext): Observable<ProtectedBranchAdminEnforced> {
    return this.reposCreateCommitSignatureProtection$Response(params, context).pipe(
      map((r: StrictHttpResponse<ProtectedBranchAdminEnforced>): ProtectedBranchAdminEnforced => r.body)
    );
  }

  /** Path part for operation `reposDeleteCommitSignatureProtection()` */
  static readonly ReposDeleteCommitSignatureProtectionPath = '/repos/{owner}/{repo}/branches/{branch}/protection/required_signatures';

  /**
   * Delete commit signature protection.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * When authenticated with admin or owner permissions to the repository, you can use this endpoint to disable required signed commits on a branch. You must enable branch protection to require signed commits.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposDeleteCommitSignatureProtection()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposDeleteCommitSignatureProtection$Response(params: ReposDeleteCommitSignatureProtection$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return reposDeleteCommitSignatureProtection(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete commit signature protection.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * When authenticated with admin or owner permissions to the repository, you can use this endpoint to disable required signed commits on a branch. You must enable branch protection to require signed commits.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposDeleteCommitSignatureProtection$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposDeleteCommitSignatureProtection(params: ReposDeleteCommitSignatureProtection$Params, context?: HttpContext): Observable<void> {
    return this.reposDeleteCommitSignatureProtection$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `reposGetStatusChecksProtection()` */
  static readonly ReposGetStatusChecksProtectionPath = '/repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks';

  /**
   * Get status checks protection.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposGetStatusChecksProtection()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetStatusChecksProtection$Response(params: ReposGetStatusChecksProtection$Params, context?: HttpContext): Observable<StrictHttpResponse<StatusCheckPolicy>> {
    return reposGetStatusChecksProtection(this.http, this.rootUrl, params, context);
  }

  /**
   * Get status checks protection.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposGetStatusChecksProtection$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetStatusChecksProtection(params: ReposGetStatusChecksProtection$Params, context?: HttpContext): Observable<StatusCheckPolicy> {
    return this.reposGetStatusChecksProtection$Response(params, context).pipe(
      map((r: StrictHttpResponse<StatusCheckPolicy>): StatusCheckPolicy => r.body)
    );
  }

  /** Path part for operation `reposRemoveStatusCheckProtection()` */
  static readonly ReposRemoveStatusCheckProtectionPath = '/repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks';

  /**
   * Remove status check protection.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposRemoveStatusCheckProtection()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposRemoveStatusCheckProtection$Response(params: ReposRemoveStatusCheckProtection$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return reposRemoveStatusCheckProtection(this.http, this.rootUrl, params, context);
  }

  /**
   * Remove status check protection.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposRemoveStatusCheckProtection$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposRemoveStatusCheckProtection(params: ReposRemoveStatusCheckProtection$Params, context?: HttpContext): Observable<void> {
    return this.reposRemoveStatusCheckProtection$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `reposUpdateStatusCheckProtection()` */
  static readonly ReposUpdateStatusCheckProtectionPath = '/repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks';

  /**
   * Update status check protection.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * Updating required status checks requires admin or owner permissions to the repository and branch protection to be enabled.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposUpdateStatusCheckProtection()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposUpdateStatusCheckProtection$Response(params: ReposUpdateStatusCheckProtection$Params, context?: HttpContext): Observable<StrictHttpResponse<StatusCheckPolicy>> {
    return reposUpdateStatusCheckProtection(this.http, this.rootUrl, params, context);
  }

  /**
   * Update status check protection.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * Updating required status checks requires admin or owner permissions to the repository and branch protection to be enabled.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposUpdateStatusCheckProtection$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposUpdateStatusCheckProtection(params: ReposUpdateStatusCheckProtection$Params, context?: HttpContext): Observable<StatusCheckPolicy> {
    return this.reposUpdateStatusCheckProtection$Response(params, context).pipe(
      map((r: StrictHttpResponse<StatusCheckPolicy>): StatusCheckPolicy => r.body)
    );
  }

  /** Path part for operation `reposGetAllStatusCheckContexts()` */
  static readonly ReposGetAllStatusCheckContextsPath = '/repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks/contexts';

  /**
   * Get all status check contexts.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposGetAllStatusCheckContexts()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetAllStatusCheckContexts$Response(params: ReposGetAllStatusCheckContexts$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<string>>> {
    return reposGetAllStatusCheckContexts(this.http, this.rootUrl, params, context);
  }

  /**
   * Get all status check contexts.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposGetAllStatusCheckContexts$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetAllStatusCheckContexts(params: ReposGetAllStatusCheckContexts$Params, context?: HttpContext): Observable<Array<string>> {
    return this.reposGetAllStatusCheckContexts$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<string>>): Array<string> => r.body)
    );
  }

  /** Path part for operation `reposSetStatusCheckContexts()` */
  static readonly ReposSetStatusCheckContextsPath = '/repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks/contexts';

  /**
   * Set status check contexts.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposSetStatusCheckContexts()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposSetStatusCheckContexts$Response(params: ReposSetStatusCheckContexts$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<string>>> {
    return reposSetStatusCheckContexts(this.http, this.rootUrl, params, context);
  }

  /**
   * Set status check contexts.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposSetStatusCheckContexts$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposSetStatusCheckContexts(params: ReposSetStatusCheckContexts$Params, context?: HttpContext): Observable<Array<string>> {
    return this.reposSetStatusCheckContexts$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<string>>): Array<string> => r.body)
    );
  }

  /** Path part for operation `reposAddStatusCheckContexts()` */
  static readonly ReposAddStatusCheckContextsPath = '/repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks/contexts';

  /**
   * Add status check contexts.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposAddStatusCheckContexts()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposAddStatusCheckContexts$Response(params: ReposAddStatusCheckContexts$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<string>>> {
    return reposAddStatusCheckContexts(this.http, this.rootUrl, params, context);
  }

  /**
   * Add status check contexts.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposAddStatusCheckContexts$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposAddStatusCheckContexts(params: ReposAddStatusCheckContexts$Params, context?: HttpContext): Observable<Array<string>> {
    return this.reposAddStatusCheckContexts$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<string>>): Array<string> => r.body)
    );
  }

  /** Path part for operation `reposRemoveStatusCheckContexts()` */
  static readonly ReposRemoveStatusCheckContextsPath = '/repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks/contexts';

  /**
   * Remove status check contexts.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposRemoveStatusCheckContexts()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposRemoveStatusCheckContexts$Response(params: ReposRemoveStatusCheckContexts$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<string>>> {
    return reposRemoveStatusCheckContexts(this.http, this.rootUrl, params, context);
  }

  /**
   * Remove status check contexts.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposRemoveStatusCheckContexts$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposRemoveStatusCheckContexts(params: ReposRemoveStatusCheckContexts$Params, context?: HttpContext): Observable<Array<string>> {
    return this.reposRemoveStatusCheckContexts$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<string>>): Array<string> => r.body)
    );
  }

  /** Path part for operation `reposGetAccessRestrictions()` */
  static readonly ReposGetAccessRestrictionsPath = '/repos/{owner}/{repo}/branches/{branch}/protection/restrictions';

  /**
   * Get access restrictions.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * Lists who has access to this protected branch.
   *
   * **Note**: Users, apps, and teams `restrictions` are only available for organization-owned repositories.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposGetAccessRestrictions()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetAccessRestrictions$Response(params: ReposGetAccessRestrictions$Params, context?: HttpContext): Observable<StrictHttpResponse<BranchRestrictionPolicy>> {
    return reposGetAccessRestrictions(this.http, this.rootUrl, params, context);
  }

  /**
   * Get access restrictions.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * Lists who has access to this protected branch.
   *
   * **Note**: Users, apps, and teams `restrictions` are only available for organization-owned repositories.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposGetAccessRestrictions$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetAccessRestrictions(params: ReposGetAccessRestrictions$Params, context?: HttpContext): Observable<BranchRestrictionPolicy> {
    return this.reposGetAccessRestrictions$Response(params, context).pipe(
      map((r: StrictHttpResponse<BranchRestrictionPolicy>): BranchRestrictionPolicy => r.body)
    );
  }

  /** Path part for operation `reposDeleteAccessRestrictions()` */
  static readonly ReposDeleteAccessRestrictionsPath = '/repos/{owner}/{repo}/branches/{branch}/protection/restrictions';

  /**
   * Delete access restrictions.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * Disables the ability to restrict who can push to this branch.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposDeleteAccessRestrictions()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposDeleteAccessRestrictions$Response(params: ReposDeleteAccessRestrictions$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return reposDeleteAccessRestrictions(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete access restrictions.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * Disables the ability to restrict who can push to this branch.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposDeleteAccessRestrictions$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposDeleteAccessRestrictions(params: ReposDeleteAccessRestrictions$Params, context?: HttpContext): Observable<void> {
    return this.reposDeleteAccessRestrictions$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `reposGetAppsWithAccessToProtectedBranch()` */
  static readonly ReposGetAppsWithAccessToProtectedBranchPath = '/repos/{owner}/{repo}/branches/{branch}/protection/restrictions/apps';

  /**
   * Get apps with access to the protected branch.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * Lists the GitHub Apps that have push access to this branch. Only installed GitHub Apps with `write` access to the `contents` permission can be added as authorized actors on a protected branch.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposGetAppsWithAccessToProtectedBranch()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetAppsWithAccessToProtectedBranch$Response(params: ReposGetAppsWithAccessToProtectedBranch$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Integration>>> {
    return reposGetAppsWithAccessToProtectedBranch(this.http, this.rootUrl, params, context);
  }

  /**
   * Get apps with access to the protected branch.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * Lists the GitHub Apps that have push access to this branch. Only installed GitHub Apps with `write` access to the `contents` permission can be added as authorized actors on a protected branch.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposGetAppsWithAccessToProtectedBranch$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetAppsWithAccessToProtectedBranch(params: ReposGetAppsWithAccessToProtectedBranch$Params, context?: HttpContext): Observable<Array<Integration>> {
    return this.reposGetAppsWithAccessToProtectedBranch$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Integration>>): Array<Integration> => r.body)
    );
  }

  /** Path part for operation `reposSetAppAccessRestrictions()` */
  static readonly ReposSetAppAccessRestrictionsPath = '/repos/{owner}/{repo}/branches/{branch}/protection/restrictions/apps';

  /**
   * Set app access restrictions.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * Replaces the list of apps that have push access to this branch. This removes all apps that previously had push access and grants push access to the new list of apps. Only installed GitHub Apps with `write` access to the `contents` permission can be added as authorized actors on a protected branch.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposSetAppAccessRestrictions()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposSetAppAccessRestrictions$Response(params: ReposSetAppAccessRestrictions$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Integration>>> {
    return reposSetAppAccessRestrictions(this.http, this.rootUrl, params, context);
  }

  /**
   * Set app access restrictions.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * Replaces the list of apps that have push access to this branch. This removes all apps that previously had push access and grants push access to the new list of apps. Only installed GitHub Apps with `write` access to the `contents` permission can be added as authorized actors on a protected branch.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposSetAppAccessRestrictions$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposSetAppAccessRestrictions(params: ReposSetAppAccessRestrictions$Params, context?: HttpContext): Observable<Array<Integration>> {
    return this.reposSetAppAccessRestrictions$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Integration>>): Array<Integration> => r.body)
    );
  }

  /** Path part for operation `reposAddAppAccessRestrictions()` */
  static readonly ReposAddAppAccessRestrictionsPath = '/repos/{owner}/{repo}/branches/{branch}/protection/restrictions/apps';

  /**
   * Add app access restrictions.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * Grants the specified apps push access for this branch. Only installed GitHub Apps with `write` access to the `contents` permission can be added as authorized actors on a protected branch.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposAddAppAccessRestrictions()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposAddAppAccessRestrictions$Response(params: ReposAddAppAccessRestrictions$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Integration>>> {
    return reposAddAppAccessRestrictions(this.http, this.rootUrl, params, context);
  }

  /**
   * Add app access restrictions.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * Grants the specified apps push access for this branch. Only installed GitHub Apps with `write` access to the `contents` permission can be added as authorized actors on a protected branch.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposAddAppAccessRestrictions$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposAddAppAccessRestrictions(params: ReposAddAppAccessRestrictions$Params, context?: HttpContext): Observable<Array<Integration>> {
    return this.reposAddAppAccessRestrictions$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Integration>>): Array<Integration> => r.body)
    );
  }

  /** Path part for operation `reposRemoveAppAccessRestrictions()` */
  static readonly ReposRemoveAppAccessRestrictionsPath = '/repos/{owner}/{repo}/branches/{branch}/protection/restrictions/apps';

  /**
   * Remove app access restrictions.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * Removes the ability of an app to push to this branch. Only installed GitHub Apps with `write` access to the `contents` permission can be added as authorized actors on a protected branch.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposRemoveAppAccessRestrictions()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposRemoveAppAccessRestrictions$Response(params: ReposRemoveAppAccessRestrictions$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Integration>>> {
    return reposRemoveAppAccessRestrictions(this.http, this.rootUrl, params, context);
  }

  /**
   * Remove app access restrictions.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * Removes the ability of an app to push to this branch. Only installed GitHub Apps with `write` access to the `contents` permission can be added as authorized actors on a protected branch.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposRemoveAppAccessRestrictions$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposRemoveAppAccessRestrictions(params: ReposRemoveAppAccessRestrictions$Params, context?: HttpContext): Observable<Array<Integration>> {
    return this.reposRemoveAppAccessRestrictions$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Integration>>): Array<Integration> => r.body)
    );
  }

  /** Path part for operation `reposGetTeamsWithAccessToProtectedBranch()` */
  static readonly ReposGetTeamsWithAccessToProtectedBranchPath = '/repos/{owner}/{repo}/branches/{branch}/protection/restrictions/teams';

  /**
   * Get teams with access to the protected branch.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * Lists the teams who have push access to this branch. The list includes child teams.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposGetTeamsWithAccessToProtectedBranch()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetTeamsWithAccessToProtectedBranch$Response(params: ReposGetTeamsWithAccessToProtectedBranch$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Team>>> {
    return reposGetTeamsWithAccessToProtectedBranch(this.http, this.rootUrl, params, context);
  }

  /**
   * Get teams with access to the protected branch.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * Lists the teams who have push access to this branch. The list includes child teams.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposGetTeamsWithAccessToProtectedBranch$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetTeamsWithAccessToProtectedBranch(params: ReposGetTeamsWithAccessToProtectedBranch$Params, context?: HttpContext): Observable<Array<Team>> {
    return this.reposGetTeamsWithAccessToProtectedBranch$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Team>>): Array<Team> => r.body)
    );
  }

  /** Path part for operation `reposSetTeamAccessRestrictions()` */
  static readonly ReposSetTeamAccessRestrictionsPath = '/repos/{owner}/{repo}/branches/{branch}/protection/restrictions/teams';

  /**
   * Set team access restrictions.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * Replaces the list of teams that have push access to this branch. This removes all teams that previously had push access and grants push access to the new list of teams. Team restrictions include child teams.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposSetTeamAccessRestrictions()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposSetTeamAccessRestrictions$Response(params: ReposSetTeamAccessRestrictions$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Team>>> {
    return reposSetTeamAccessRestrictions(this.http, this.rootUrl, params, context);
  }

  /**
   * Set team access restrictions.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * Replaces the list of teams that have push access to this branch. This removes all teams that previously had push access and grants push access to the new list of teams. Team restrictions include child teams.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposSetTeamAccessRestrictions$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposSetTeamAccessRestrictions(params: ReposSetTeamAccessRestrictions$Params, context?: HttpContext): Observable<Array<Team>> {
    return this.reposSetTeamAccessRestrictions$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Team>>): Array<Team> => r.body)
    );
  }

  /** Path part for operation `reposAddTeamAccessRestrictions()` */
  static readonly ReposAddTeamAccessRestrictionsPath = '/repos/{owner}/{repo}/branches/{branch}/protection/restrictions/teams';

  /**
   * Add team access restrictions.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * Grants the specified teams push access for this branch. You can also give push access to child teams.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposAddTeamAccessRestrictions()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposAddTeamAccessRestrictions$Response(params: ReposAddTeamAccessRestrictions$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Team>>> {
    return reposAddTeamAccessRestrictions(this.http, this.rootUrl, params, context);
  }

  /**
   * Add team access restrictions.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * Grants the specified teams push access for this branch. You can also give push access to child teams.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposAddTeamAccessRestrictions$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposAddTeamAccessRestrictions(params: ReposAddTeamAccessRestrictions$Params, context?: HttpContext): Observable<Array<Team>> {
    return this.reposAddTeamAccessRestrictions$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Team>>): Array<Team> => r.body)
    );
  }

  /** Path part for operation `reposRemoveTeamAccessRestrictions()` */
  static readonly ReposRemoveTeamAccessRestrictionsPath = '/repos/{owner}/{repo}/branches/{branch}/protection/restrictions/teams';

  /**
   * Remove team access restrictions.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * Removes the ability of a team to push to this branch. You can also remove push access for child teams.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposRemoveTeamAccessRestrictions()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposRemoveTeamAccessRestrictions$Response(params: ReposRemoveTeamAccessRestrictions$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Team>>> {
    return reposRemoveTeamAccessRestrictions(this.http, this.rootUrl, params, context);
  }

  /**
   * Remove team access restrictions.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * Removes the ability of a team to push to this branch. You can also remove push access for child teams.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposRemoveTeamAccessRestrictions$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposRemoveTeamAccessRestrictions(params: ReposRemoveTeamAccessRestrictions$Params, context?: HttpContext): Observable<Array<Team>> {
    return this.reposRemoveTeamAccessRestrictions$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Team>>): Array<Team> => r.body)
    );
  }

  /** Path part for operation `reposGetUsersWithAccessToProtectedBranch()` */
  static readonly ReposGetUsersWithAccessToProtectedBranchPath = '/repos/{owner}/{repo}/branches/{branch}/protection/restrictions/users';

  /**
   * Get users with access to the protected branch.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * Lists the people who have push access to this branch.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposGetUsersWithAccessToProtectedBranch()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetUsersWithAccessToProtectedBranch$Response(params: ReposGetUsersWithAccessToProtectedBranch$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<SimpleUser>>> {
    return reposGetUsersWithAccessToProtectedBranch(this.http, this.rootUrl, params, context);
  }

  /**
   * Get users with access to the protected branch.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * Lists the people who have push access to this branch.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposGetUsersWithAccessToProtectedBranch$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetUsersWithAccessToProtectedBranch(params: ReposGetUsersWithAccessToProtectedBranch$Params, context?: HttpContext): Observable<Array<SimpleUser>> {
    return this.reposGetUsersWithAccessToProtectedBranch$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<SimpleUser>>): Array<SimpleUser> => r.body)
    );
  }

  /** Path part for operation `reposSetUserAccessRestrictions()` */
  static readonly ReposSetUserAccessRestrictionsPath = '/repos/{owner}/{repo}/branches/{branch}/protection/restrictions/users';

  /**
   * Set user access restrictions.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * Replaces the list of people that have push access to this branch. This removes all people that previously had push access and grants push access to the new list of people.
   *
   * | Type    | Description                                                                                                                   |
   * | ------- | ----------------------------------------------------------------------------------------------------------------------------- |
   * | `array` | Usernames for people who can have push access. **Note**: The list of users, apps, and teams in total is limited to 100 items. |
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposSetUserAccessRestrictions()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposSetUserAccessRestrictions$Response(params: ReposSetUserAccessRestrictions$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<SimpleUser>>> {
    return reposSetUserAccessRestrictions(this.http, this.rootUrl, params, context);
  }

  /**
   * Set user access restrictions.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * Replaces the list of people that have push access to this branch. This removes all people that previously had push access and grants push access to the new list of people.
   *
   * | Type    | Description                                                                                                                   |
   * | ------- | ----------------------------------------------------------------------------------------------------------------------------- |
   * | `array` | Usernames for people who can have push access. **Note**: The list of users, apps, and teams in total is limited to 100 items. |
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposSetUserAccessRestrictions$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposSetUserAccessRestrictions(params: ReposSetUserAccessRestrictions$Params, context?: HttpContext): Observable<Array<SimpleUser>> {
    return this.reposSetUserAccessRestrictions$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<SimpleUser>>): Array<SimpleUser> => r.body)
    );
  }

  /** Path part for operation `reposAddUserAccessRestrictions()` */
  static readonly ReposAddUserAccessRestrictionsPath = '/repos/{owner}/{repo}/branches/{branch}/protection/restrictions/users';

  /**
   * Add user access restrictions.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * Grants the specified people push access for this branch.
   *
   * | Type    | Description                                                                                                                   |
   * | ------- | ----------------------------------------------------------------------------------------------------------------------------- |
   * | `array` | Usernames for people who can have push access. **Note**: The list of users, apps, and teams in total is limited to 100 items. |
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposAddUserAccessRestrictions()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposAddUserAccessRestrictions$Response(params: ReposAddUserAccessRestrictions$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<SimpleUser>>> {
    return reposAddUserAccessRestrictions(this.http, this.rootUrl, params, context);
  }

  /**
   * Add user access restrictions.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * Grants the specified people push access for this branch.
   *
   * | Type    | Description                                                                                                                   |
   * | ------- | ----------------------------------------------------------------------------------------------------------------------------- |
   * | `array` | Usernames for people who can have push access. **Note**: The list of users, apps, and teams in total is limited to 100 items. |
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposAddUserAccessRestrictions$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposAddUserAccessRestrictions(params: ReposAddUserAccessRestrictions$Params, context?: HttpContext): Observable<Array<SimpleUser>> {
    return this.reposAddUserAccessRestrictions$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<SimpleUser>>): Array<SimpleUser> => r.body)
    );
  }

  /** Path part for operation `reposRemoveUserAccessRestrictions()` */
  static readonly ReposRemoveUserAccessRestrictionsPath = '/repos/{owner}/{repo}/branches/{branch}/protection/restrictions/users';

  /**
   * Remove user access restrictions.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * Removes the ability of a user to push to this branch.
   *
   * | Type    | Description                                                                                                                                   |
   * | ------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
   * | `array` | Usernames of the people who should no longer have push access. **Note**: The list of users, apps, and teams in total is limited to 100 items. |
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposRemoveUserAccessRestrictions()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposRemoveUserAccessRestrictions$Response(params: ReposRemoveUserAccessRestrictions$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<SimpleUser>>> {
    return reposRemoveUserAccessRestrictions(this.http, this.rootUrl, params, context);
  }

  /**
   * Remove user access restrictions.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * Removes the ability of a user to push to this branch.
   *
   * | Type    | Description                                                                                                                                   |
   * | ------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
   * | `array` | Usernames of the people who should no longer have push access. **Note**: The list of users, apps, and teams in total is limited to 100 items. |
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposRemoveUserAccessRestrictions$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposRemoveUserAccessRestrictions(params: ReposRemoveUserAccessRestrictions$Params, context?: HttpContext): Observable<Array<SimpleUser>> {
    return this.reposRemoveUserAccessRestrictions$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<SimpleUser>>): Array<SimpleUser> => r.body)
    );
  }

  /** Path part for operation `reposRenameBranch()` */
  static readonly ReposRenameBranchPath = '/repos/{owner}/{repo}/branches/{branch}/rename';

  /**
   * Rename a branch.
   *
   * Renames a branch in a repository.
   *
   * **Note:** Although the API responds immediately, the branch rename process might take some extra time to complete in the background. You won't be able to push to the old branch name while the rename process is in progress. For more information, see "[Renaming a branch](https://docs.github.com/github/administering-a-repository/renaming-a-branch)".
   *
   * The permissions required to use this endpoint depends on whether you are renaming the default branch.
   *
   * To rename a non-default branch:
   *
   * * Users must have push access.
   * * GitHub Apps must have the `contents:write` repository permission.
   *
   * To rename the default branch:
   *
   * * Users must have admin or owner permissions.
   * * GitHub Apps must have the `administration:write` repository permission.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposRenameBranch()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposRenameBranch$Response(params: ReposRenameBranch$Params, context?: HttpContext): Observable<StrictHttpResponse<BranchWithProtection>> {
    return reposRenameBranch(this.http, this.rootUrl, params, context);
  }

  /**
   * Rename a branch.
   *
   * Renames a branch in a repository.
   *
   * **Note:** Although the API responds immediately, the branch rename process might take some extra time to complete in the background. You won't be able to push to the old branch name while the rename process is in progress. For more information, see "[Renaming a branch](https://docs.github.com/github/administering-a-repository/renaming-a-branch)".
   *
   * The permissions required to use this endpoint depends on whether you are renaming the default branch.
   *
   * To rename a non-default branch:
   *
   * * Users must have push access.
   * * GitHub Apps must have the `contents:write` repository permission.
   *
   * To rename the default branch:
   *
   * * Users must have admin or owner permissions.
   * * GitHub Apps must have the `administration:write` repository permission.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposRenameBranch$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposRenameBranch(params: ReposRenameBranch$Params, context?: HttpContext): Observable<BranchWithProtection> {
    return this.reposRenameBranch$Response(params, context).pipe(
      map((r: StrictHttpResponse<BranchWithProtection>): BranchWithProtection => r.body)
    );
  }

  /** Path part for operation `reposCodeownersErrors()` */
  static readonly ReposCodeownersErrorsPath = '/repos/{owner}/{repo}/codeowners/errors';

  /**
   * List CODEOWNERS errors.
   *
   * List any syntax errors that are detected in the CODEOWNERS
   * file.
   *
   * For more information about the correct CODEOWNERS syntax,
   * see "[About code owners](https://docs.github.com/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)."
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposCodeownersErrors()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposCodeownersErrors$Response(params: ReposCodeownersErrors$Params, context?: HttpContext): Observable<StrictHttpResponse<CodeownersErrors>> {
    return reposCodeownersErrors(this.http, this.rootUrl, params, context);
  }

  /**
   * List CODEOWNERS errors.
   *
   * List any syntax errors that are detected in the CODEOWNERS
   * file.
   *
   * For more information about the correct CODEOWNERS syntax,
   * see "[About code owners](https://docs.github.com/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)."
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposCodeownersErrors$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposCodeownersErrors(params: ReposCodeownersErrors$Params, context?: HttpContext): Observable<CodeownersErrors> {
    return this.reposCodeownersErrors$Response(params, context).pipe(
      map((r: StrictHttpResponse<CodeownersErrors>): CodeownersErrors => r.body)
    );
  }

  /** Path part for operation `reposListCollaborators()` */
  static readonly ReposListCollaboratorsPath = '/repos/{owner}/{repo}/collaborators';

  /**
   * List repository collaborators.
   *
   * For organization-owned repositories, the list of collaborators includes outside collaborators, organization members that are direct collaborators, organization members with access through team memberships, organization members with access through default organization permissions, and organization owners.
   * Organization members with write, maintain, or admin privileges on the organization-owned repository can use this endpoint.
   *
   * Team members will include the members of child teams.
   *
   * You must authenticate using an access token with the `read:org` and `repo` scopes with push access to use this
   * endpoint. GitHub Apps must have the `members` organization permission and `metadata` repository permission to use this
   * endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposListCollaborators()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposListCollaborators$Response(params: ReposListCollaborators$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Collaborator>>> {
    return reposListCollaborators(this.http, this.rootUrl, params, context);
  }

  /**
   * List repository collaborators.
   *
   * For organization-owned repositories, the list of collaborators includes outside collaborators, organization members that are direct collaborators, organization members with access through team memberships, organization members with access through default organization permissions, and organization owners.
   * Organization members with write, maintain, or admin privileges on the organization-owned repository can use this endpoint.
   *
   * Team members will include the members of child teams.
   *
   * You must authenticate using an access token with the `read:org` and `repo` scopes with push access to use this
   * endpoint. GitHub Apps must have the `members` organization permission and `metadata` repository permission to use this
   * endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposListCollaborators$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposListCollaborators(params: ReposListCollaborators$Params, context?: HttpContext): Observable<Array<Collaborator>> {
    return this.reposListCollaborators$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Collaborator>>): Array<Collaborator> => r.body)
    );
  }

  /** Path part for operation `reposCheckCollaborator()` */
  static readonly ReposCheckCollaboratorPath = '/repos/{owner}/{repo}/collaborators/{username}';

  /**
   * Check if a user is a repository collaborator.
   *
   * For organization-owned repositories, the list of collaborators includes outside collaborators, organization members that are direct collaborators, organization members with access through team memberships, organization members with access through default organization permissions, and organization owners.
   *
   * Team members will include the members of child teams.
   *
   * You must authenticate using an access token with the `read:org` and `repo` scopes with push access to use this
   * endpoint. GitHub Apps must have the `members` organization permission and `metadata` repository permission to use this
   * endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposCheckCollaborator()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposCheckCollaborator$Response(params: ReposCheckCollaborator$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return reposCheckCollaborator(this.http, this.rootUrl, params, context);
  }

  /**
   * Check if a user is a repository collaborator.
   *
   * For organization-owned repositories, the list of collaborators includes outside collaborators, organization members that are direct collaborators, organization members with access through team memberships, organization members with access through default organization permissions, and organization owners.
   *
   * Team members will include the members of child teams.
   *
   * You must authenticate using an access token with the `read:org` and `repo` scopes with push access to use this
   * endpoint. GitHub Apps must have the `members` organization permission and `metadata` repository permission to use this
   * endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposCheckCollaborator$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposCheckCollaborator(params: ReposCheckCollaborator$Params, context?: HttpContext): Observable<void> {
    return this.reposCheckCollaborator$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `reposAddCollaborator()` */
  static readonly ReposAddCollaboratorPath = '/repos/{owner}/{repo}/collaborators/{username}';

  /**
   * Add a repository collaborator.
   *
   * This endpoint triggers [notifications](https://docs.github.com/github/managing-subscriptions-and-notifications-on-github/about-notifications). Creating content too quickly using this endpoint may result in secondary rate limiting. See "[Secondary rate limits](https://docs.github.com/rest/overview/resources-in-the-rest-api#secondary-rate-limits)" and "[Dealing with secondary rate limits](https://docs.github.com/rest/guides/best-practices-for-integrators#dealing-with-secondary-rate-limits)" for details.
   *
   * Adding an outside collaborator may be restricted by enterprise administrators. For more information, see "[Enforcing repository management policies in your enterprise](https://docs.github.com/admin/policies/enforcing-policies-for-your-enterprise/enforcing-repository-management-policies-in-your-enterprise#enforcing-a-policy-for-inviting-outside-collaborators-to-repositories)."
   *
   * For more information on permission levels, see "[Repository permission levels for an organization](https://docs.github.com/github/setting-up-and-managing-organizations-and-teams/repository-permission-levels-for-an-organization#permission-levels-for-repositories-owned-by-an-organization)". There are restrictions on which permissions can be granted to organization members when an organization base role is in place. In this case, the permission being given must be equal to or higher than the org base permission. Otherwise, the request will fail with:
   *
   * ```
   * Cannot assign {member} permission of {role name}
   * ```
   *
   * Note that, if you choose not to pass any parameters, you'll need to set `Content-Length` to zero when calling out to this endpoint. For more information, see "[HTTP verbs](https://docs.github.com/rest/overview/resources-in-the-rest-api#http-verbs)."
   *
   * The invitee will receive a notification that they have been invited to the repository, which they must accept or decline. They may do this via the notifications page, the email they receive, or by using the [API](https://docs.github.com/rest/collaborators/invitations).
   *
   * **Updating an existing collaborator's permission level**
   *
   * The endpoint can also be used to change the permissions of an existing collaborator without first removing and re-adding the collaborator. To change the permissions, use the same endpoint and pass a different `permission` parameter. The response will be a `204`, with no other indication that the permission level changed.
   *
   * **Rate limits**
   *
   * You are limited to sending 50 invitations to a repository per 24 hour period. Note there is no limit if you are inviting organization members to an organization repository.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposAddCollaborator()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposAddCollaborator$Response(params: ReposAddCollaborator$Params, context?: HttpContext): Observable<StrictHttpResponse<RepositoryInvitation>> {
    return reposAddCollaborator(this.http, this.rootUrl, params, context);
  }

  /**
   * Add a repository collaborator.
   *
   * This endpoint triggers [notifications](https://docs.github.com/github/managing-subscriptions-and-notifications-on-github/about-notifications). Creating content too quickly using this endpoint may result in secondary rate limiting. See "[Secondary rate limits](https://docs.github.com/rest/overview/resources-in-the-rest-api#secondary-rate-limits)" and "[Dealing with secondary rate limits](https://docs.github.com/rest/guides/best-practices-for-integrators#dealing-with-secondary-rate-limits)" for details.
   *
   * Adding an outside collaborator may be restricted by enterprise administrators. For more information, see "[Enforcing repository management policies in your enterprise](https://docs.github.com/admin/policies/enforcing-policies-for-your-enterprise/enforcing-repository-management-policies-in-your-enterprise#enforcing-a-policy-for-inviting-outside-collaborators-to-repositories)."
   *
   * For more information on permission levels, see "[Repository permission levels for an organization](https://docs.github.com/github/setting-up-and-managing-organizations-and-teams/repository-permission-levels-for-an-organization#permission-levels-for-repositories-owned-by-an-organization)". There are restrictions on which permissions can be granted to organization members when an organization base role is in place. In this case, the permission being given must be equal to or higher than the org base permission. Otherwise, the request will fail with:
   *
   * ```
   * Cannot assign {member} permission of {role name}
   * ```
   *
   * Note that, if you choose not to pass any parameters, you'll need to set `Content-Length` to zero when calling out to this endpoint. For more information, see "[HTTP verbs](https://docs.github.com/rest/overview/resources-in-the-rest-api#http-verbs)."
   *
   * The invitee will receive a notification that they have been invited to the repository, which they must accept or decline. They may do this via the notifications page, the email they receive, or by using the [API](https://docs.github.com/rest/collaborators/invitations).
   *
   * **Updating an existing collaborator's permission level**
   *
   * The endpoint can also be used to change the permissions of an existing collaborator without first removing and re-adding the collaborator. To change the permissions, use the same endpoint and pass a different `permission` parameter. The response will be a `204`, with no other indication that the permission level changed.
   *
   * **Rate limits**
   *
   * You are limited to sending 50 invitations to a repository per 24 hour period. Note there is no limit if you are inviting organization members to an organization repository.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposAddCollaborator$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposAddCollaborator(params: ReposAddCollaborator$Params, context?: HttpContext): Observable<RepositoryInvitation> {
    return this.reposAddCollaborator$Response(params, context).pipe(
      map((r: StrictHttpResponse<RepositoryInvitation>): RepositoryInvitation => r.body)
    );
  }

  /** Path part for operation `reposRemoveCollaborator()` */
  static readonly ReposRemoveCollaboratorPath = '/repos/{owner}/{repo}/collaborators/{username}';

  /**
   * Remove a repository collaborator.
   *
   * Removes a collaborator from a repository.
   *
   * To use this endpoint, the authenticated user must either be an administrator of the repository or target themselves for removal.
   *
   * This endpoint also:
   * - Cancels any outstanding invitations
   * - Unasigns the user from any issues
   * - Removes access to organization projects if the user is not an organization member and is not a collaborator on any other organization repositories.
   * - Unstars the repository
   * - Updates access permissions to packages
   *
   * Removing a user as a collaborator has the following effects on forks:
   *  - If the user had access to a fork through their membership to this repository, the user will also be removed from the fork.
   *  - If the user had their own fork of the repository, the fork will be deleted.
   *  - If the user still has read access to the repository, open pull requests by this user from a fork will be denied.
   *
   * **Note**: A user can still have access to the repository through organization permissions like base repository permissions.
   *
   * Although the API responds immediately, the additional permission updates might take some extra time to complete in the background.
   *
   * For more information on fork permissions, see "[About permissions and visibility of forks](https://docs.github.com/pull-requests/collaborating-with-pull-requests/working-with-forks/about-permissions-and-visibility-of-forks)".
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposRemoveCollaborator()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposRemoveCollaborator$Response(params: ReposRemoveCollaborator$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return reposRemoveCollaborator(this.http, this.rootUrl, params, context);
  }

  /**
   * Remove a repository collaborator.
   *
   * Removes a collaborator from a repository.
   *
   * To use this endpoint, the authenticated user must either be an administrator of the repository or target themselves for removal.
   *
   * This endpoint also:
   * - Cancels any outstanding invitations
   * - Unasigns the user from any issues
   * - Removes access to organization projects if the user is not an organization member and is not a collaborator on any other organization repositories.
   * - Unstars the repository
   * - Updates access permissions to packages
   *
   * Removing a user as a collaborator has the following effects on forks:
   *  - If the user had access to a fork through their membership to this repository, the user will also be removed from the fork.
   *  - If the user had their own fork of the repository, the fork will be deleted.
   *  - If the user still has read access to the repository, open pull requests by this user from a fork will be denied.
   *
   * **Note**: A user can still have access to the repository through organization permissions like base repository permissions.
   *
   * Although the API responds immediately, the additional permission updates might take some extra time to complete in the background.
   *
   * For more information on fork permissions, see "[About permissions and visibility of forks](https://docs.github.com/pull-requests/collaborating-with-pull-requests/working-with-forks/about-permissions-and-visibility-of-forks)".
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposRemoveCollaborator$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposRemoveCollaborator(params: ReposRemoveCollaborator$Params, context?: HttpContext): Observable<void> {
    return this.reposRemoveCollaborator$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `reposGetCollaboratorPermissionLevel()` */
  static readonly ReposGetCollaboratorPermissionLevelPath = '/repos/{owner}/{repo}/collaborators/{username}/permission';

  /**
   * Get repository permissions for a user.
   *
   * Checks the repository permission of a collaborator. The possible repository
   * permissions are `admin`, `write`, `read`, and `none`.
   *
   * *Note*: The `permission` attribute provides the legacy base roles of `admin`, `write`, `read`, and `none`, where the
   * `maintain` role is mapped to `write` and the `triage` role is mapped to `read`. To determine the role assigned to the
   * collaborator, see the `role_name` attribute, which will provide the full role name, including custom roles. The
   * `permissions` hash can also be used to determine which base level of access the collaborator has to the repository.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposGetCollaboratorPermissionLevel()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetCollaboratorPermissionLevel$Response(params: ReposGetCollaboratorPermissionLevel$Params, context?: HttpContext): Observable<StrictHttpResponse<RepositoryCollaboratorPermission>> {
    return reposGetCollaboratorPermissionLevel(this.http, this.rootUrl, params, context);
  }

  /**
   * Get repository permissions for a user.
   *
   * Checks the repository permission of a collaborator. The possible repository
   * permissions are `admin`, `write`, `read`, and `none`.
   *
   * *Note*: The `permission` attribute provides the legacy base roles of `admin`, `write`, `read`, and `none`, where the
   * `maintain` role is mapped to `write` and the `triage` role is mapped to `read`. To determine the role assigned to the
   * collaborator, see the `role_name` attribute, which will provide the full role name, including custom roles. The
   * `permissions` hash can also be used to determine which base level of access the collaborator has to the repository.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposGetCollaboratorPermissionLevel$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetCollaboratorPermissionLevel(params: ReposGetCollaboratorPermissionLevel$Params, context?: HttpContext): Observable<RepositoryCollaboratorPermission> {
    return this.reposGetCollaboratorPermissionLevel$Response(params, context).pipe(
      map((r: StrictHttpResponse<RepositoryCollaboratorPermission>): RepositoryCollaboratorPermission => r.body)
    );
  }

  /** Path part for operation `reposListCommitCommentsForRepo()` */
  static readonly ReposListCommitCommentsForRepoPath = '/repos/{owner}/{repo}/comments';

  /**
   * List commit comments for a repository.
   *
   * Commit Comments use [these custom media types](https://docs.github.com/rest/overview/media-types). You can read more about the use of media types in the API [here](https://docs.github.com/rest/overview/media-types/).
   *
   * Comments are ordered by ascending ID.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposListCommitCommentsForRepo()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposListCommitCommentsForRepo$Response(params: ReposListCommitCommentsForRepo$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<CommitComment>>> {
    return reposListCommitCommentsForRepo(this.http, this.rootUrl, params, context);
  }

  /**
   * List commit comments for a repository.
   *
   * Commit Comments use [these custom media types](https://docs.github.com/rest/overview/media-types). You can read more about the use of media types in the API [here](https://docs.github.com/rest/overview/media-types/).
   *
   * Comments are ordered by ascending ID.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposListCommitCommentsForRepo$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposListCommitCommentsForRepo(params: ReposListCommitCommentsForRepo$Params, context?: HttpContext): Observable<Array<CommitComment>> {
    return this.reposListCommitCommentsForRepo$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<CommitComment>>): Array<CommitComment> => r.body)
    );
  }

  /** Path part for operation `reposGetCommitComment()` */
  static readonly ReposGetCommitCommentPath = '/repos/{owner}/{repo}/comments/{comment_id}';

  /**
   * Get a commit comment.
   *
   *
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposGetCommitComment()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetCommitComment$Response(params: ReposGetCommitComment$Params, context?: HttpContext): Observable<StrictHttpResponse<CommitComment>> {
    return reposGetCommitComment(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a commit comment.
   *
   *
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposGetCommitComment$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetCommitComment(params: ReposGetCommitComment$Params, context?: HttpContext): Observable<CommitComment> {
    return this.reposGetCommitComment$Response(params, context).pipe(
      map((r: StrictHttpResponse<CommitComment>): CommitComment => r.body)
    );
  }

  /** Path part for operation `reposDeleteCommitComment()` */
  static readonly ReposDeleteCommitCommentPath = '/repos/{owner}/{repo}/comments/{comment_id}';

  /**
   * Delete a commit comment.
   *
   *
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposDeleteCommitComment()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposDeleteCommitComment$Response(params: ReposDeleteCommitComment$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return reposDeleteCommitComment(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete a commit comment.
   *
   *
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposDeleteCommitComment$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposDeleteCommitComment(params: ReposDeleteCommitComment$Params, context?: HttpContext): Observable<void> {
    return this.reposDeleteCommitComment$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `reposUpdateCommitComment()` */
  static readonly ReposUpdateCommitCommentPath = '/repos/{owner}/{repo}/comments/{comment_id}';

  /**
   * Update a commit comment.
   *
   *
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposUpdateCommitComment()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposUpdateCommitComment$Response(params: ReposUpdateCommitComment$Params, context?: HttpContext): Observable<StrictHttpResponse<CommitComment>> {
    return reposUpdateCommitComment(this.http, this.rootUrl, params, context);
  }

  /**
   * Update a commit comment.
   *
   *
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposUpdateCommitComment$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposUpdateCommitComment(params: ReposUpdateCommitComment$Params, context?: HttpContext): Observable<CommitComment> {
    return this.reposUpdateCommitComment$Response(params, context).pipe(
      map((r: StrictHttpResponse<CommitComment>): CommitComment => r.body)
    );
  }

  /** Path part for operation `reposListCommits()` */
  static readonly ReposListCommitsPath = '/repos/{owner}/{repo}/commits';

  /**
   * List commits.
   *
   * **Signature verification object**
   *
   * The response will include a `verification` object that describes the result of verifying the commit's signature. The following fields are included in the `verification` object:
   *
   * | Name | Type | Description |
   * | ---- | ---- | ----------- |
   * | `verified` | `boolean` | Indicates whether GitHub considers the signature in this commit to be verified. |
   * | `reason` | `string` | The reason for verified value. Possible values and their meanings are enumerated in table below. |
   * | `signature` | `string` | The signature that was extracted from the commit. |
   * | `payload` | `string` | The value that was signed. |
   *
   * These are the possible values for `reason` in the `verification` object:
   *
   * | Value | Description |
   * | ----- | ----------- |
   * | `expired_key` | The key that made the signature is expired. |
   * | `not_signing_key` | The "signing" flag is not among the usage flags in the GPG key that made the signature. |
   * | `gpgverify_error` | There was an error communicating with the signature verification service. |
   * | `gpgverify_unavailable` | The signature verification service is currently unavailable. |
   * | `unsigned` | The object does not include a signature. |
   * | `unknown_signature_type` | A non-PGP signature was found in the commit. |
   * | `no_user` | No user was associated with the `committer` email address in the commit. |
   * | `unverified_email` | The `committer` email address in the commit was associated with a user, but the email address is not verified on their account. |
   * | `bad_email` | The `committer` email address in the commit is not included in the identities of the PGP key that made the signature. |
   * | `unknown_key` | The key that made the signature has not been registered with any user's account. |
   * | `malformed_signature` | There was an error parsing the signature. |
   * | `invalid` | The signature could not be cryptographically verified using the key whose key-id was found in the signature. |
   * | `valid` | None of the above errors applied, so the signature is considered to be verified. |
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposListCommits()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposListCommits$Response(params: ReposListCommits$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Commit>>> {
    return reposListCommits(this.http, this.rootUrl, params, context);
  }

  /**
   * List commits.
   *
   * **Signature verification object**
   *
   * The response will include a `verification` object that describes the result of verifying the commit's signature. The following fields are included in the `verification` object:
   *
   * | Name | Type | Description |
   * | ---- | ---- | ----------- |
   * | `verified` | `boolean` | Indicates whether GitHub considers the signature in this commit to be verified. |
   * | `reason` | `string` | The reason for verified value. Possible values and their meanings are enumerated in table below. |
   * | `signature` | `string` | The signature that was extracted from the commit. |
   * | `payload` | `string` | The value that was signed. |
   *
   * These are the possible values for `reason` in the `verification` object:
   *
   * | Value | Description |
   * | ----- | ----------- |
   * | `expired_key` | The key that made the signature is expired. |
   * | `not_signing_key` | The "signing" flag is not among the usage flags in the GPG key that made the signature. |
   * | `gpgverify_error` | There was an error communicating with the signature verification service. |
   * | `gpgverify_unavailable` | The signature verification service is currently unavailable. |
   * | `unsigned` | The object does not include a signature. |
   * | `unknown_signature_type` | A non-PGP signature was found in the commit. |
   * | `no_user` | No user was associated with the `committer` email address in the commit. |
   * | `unverified_email` | The `committer` email address in the commit was associated with a user, but the email address is not verified on their account. |
   * | `bad_email` | The `committer` email address in the commit is not included in the identities of the PGP key that made the signature. |
   * | `unknown_key` | The key that made the signature has not been registered with any user's account. |
   * | `malformed_signature` | There was an error parsing the signature. |
   * | `invalid` | The signature could not be cryptographically verified using the key whose key-id was found in the signature. |
   * | `valid` | None of the above errors applied, so the signature is considered to be verified. |
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposListCommits$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposListCommits(params: ReposListCommits$Params, context?: HttpContext): Observable<Array<Commit>> {
    return this.reposListCommits$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Commit>>): Array<Commit> => r.body)
    );
  }

  /** Path part for operation `reposListBranchesForHeadCommit()` */
  static readonly ReposListBranchesForHeadCommitPath = '/repos/{owner}/{repo}/commits/{commit_sha}/branches-where-head';

  /**
   * List branches for HEAD commit.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * Returns all branches where the given commit SHA is the HEAD, or latest commit for the branch.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposListBranchesForHeadCommit()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposListBranchesForHeadCommit$Response(params: ReposListBranchesForHeadCommit$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<BranchShort>>> {
    return reposListBranchesForHeadCommit(this.http, this.rootUrl, params, context);
  }

  /**
   * List branches for HEAD commit.
   *
   * Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * Returns all branches where the given commit SHA is the HEAD, or latest commit for the branch.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposListBranchesForHeadCommit$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposListBranchesForHeadCommit(params: ReposListBranchesForHeadCommit$Params, context?: HttpContext): Observable<Array<BranchShort>> {
    return this.reposListBranchesForHeadCommit$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<BranchShort>>): Array<BranchShort> => r.body)
    );
  }

  /** Path part for operation `reposListCommentsForCommit()` */
  static readonly ReposListCommentsForCommitPath = '/repos/{owner}/{repo}/commits/{commit_sha}/comments';

  /**
   * List commit comments.
   *
   * Use the `:commit_sha` to specify the commit that will have its comments listed.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposListCommentsForCommit()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposListCommentsForCommit$Response(params: ReposListCommentsForCommit$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<CommitComment>>> {
    return reposListCommentsForCommit(this.http, this.rootUrl, params, context);
  }

  /**
   * List commit comments.
   *
   * Use the `:commit_sha` to specify the commit that will have its comments listed.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposListCommentsForCommit$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposListCommentsForCommit(params: ReposListCommentsForCommit$Params, context?: HttpContext): Observable<Array<CommitComment>> {
    return this.reposListCommentsForCommit$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<CommitComment>>): Array<CommitComment> => r.body)
    );
  }

  /** Path part for operation `reposCreateCommitComment()` */
  static readonly ReposCreateCommitCommentPath = '/repos/{owner}/{repo}/commits/{commit_sha}/comments';

  /**
   * Create a commit comment.
   *
   * Create a comment for a commit using its `:commit_sha`.
   *
   * This endpoint triggers [notifications](https://docs.github.com/github/managing-subscriptions-and-notifications-on-github/about-notifications). Creating content too quickly using this endpoint may result in secondary rate limiting. See "[Secondary rate limits](https://docs.github.com/rest/overview/resources-in-the-rest-api#secondary-rate-limits)" and "[Dealing with secondary rate limits](https://docs.github.com/rest/guides/best-practices-for-integrators#dealing-with-secondary-rate-limits)" for details.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposCreateCommitComment()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposCreateCommitComment$Response(params: ReposCreateCommitComment$Params, context?: HttpContext): Observable<StrictHttpResponse<CommitComment>> {
    return reposCreateCommitComment(this.http, this.rootUrl, params, context);
  }

  /**
   * Create a commit comment.
   *
   * Create a comment for a commit using its `:commit_sha`.
   *
   * This endpoint triggers [notifications](https://docs.github.com/github/managing-subscriptions-and-notifications-on-github/about-notifications). Creating content too quickly using this endpoint may result in secondary rate limiting. See "[Secondary rate limits](https://docs.github.com/rest/overview/resources-in-the-rest-api#secondary-rate-limits)" and "[Dealing with secondary rate limits](https://docs.github.com/rest/guides/best-practices-for-integrators#dealing-with-secondary-rate-limits)" for details.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposCreateCommitComment$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposCreateCommitComment(params: ReposCreateCommitComment$Params, context?: HttpContext): Observable<CommitComment> {
    return this.reposCreateCommitComment$Response(params, context).pipe(
      map((r: StrictHttpResponse<CommitComment>): CommitComment => r.body)
    );
  }

  /** Path part for operation `reposListPullRequestsAssociatedWithCommit()` */
  static readonly ReposListPullRequestsAssociatedWithCommitPath = '/repos/{owner}/{repo}/commits/{commit_sha}/pulls';

  /**
   * List pull requests associated with a commit.
   *
   * Lists the merged pull request that introduced the commit to the repository. If the commit is not present in the default branch, will only return open pull requests associated with the commit.
   *
   * To list the open or merged pull requests associated with a branch, you can set the `commit_sha` parameter to the branch name.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposListPullRequestsAssociatedWithCommit()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposListPullRequestsAssociatedWithCommit$Response(params: ReposListPullRequestsAssociatedWithCommit$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<PullRequestSimple>>> {
    return reposListPullRequestsAssociatedWithCommit(this.http, this.rootUrl, params, context);
  }

  /**
   * List pull requests associated with a commit.
   *
   * Lists the merged pull request that introduced the commit to the repository. If the commit is not present in the default branch, will only return open pull requests associated with the commit.
   *
   * To list the open or merged pull requests associated with a branch, you can set the `commit_sha` parameter to the branch name.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposListPullRequestsAssociatedWithCommit$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposListPullRequestsAssociatedWithCommit(params: ReposListPullRequestsAssociatedWithCommit$Params, context?: HttpContext): Observable<Array<PullRequestSimple>> {
    return this.reposListPullRequestsAssociatedWithCommit$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<PullRequestSimple>>): Array<PullRequestSimple> => r.body)
    );
  }

  /** Path part for operation `reposGetCommit()` */
  static readonly ReposGetCommitPath = '/repos/{owner}/{repo}/commits/{ref}';

  /**
   * Get a commit.
   *
   * Returns the contents of a single commit reference. You must have `read` access for the repository to use this endpoint.
   *
   * **Note:** If there are more than 300 files in the commit diff, the response will include pagination link headers for the remaining files, up to a limit of 3000 files. Each page contains the static commit information, and the only changes are to the file listing.
   *
   * You can pass the appropriate [media type](https://docs.github.com/rest/overview/media-types/#commits-commit-comparison-and-pull-requests) to  fetch `diff` and `patch` formats. Diffs with binary data will have no `patch` property.
   *
   * To return only the SHA-1 hash of the commit reference, you can provide the `sha` custom [media type](https://docs.github.com/rest/overview/media-types/#commits-commit-comparison-and-pull-requests) in the `Accept` header. You can use this endpoint to check if a remote reference's SHA-1 hash is the same as your local reference's SHA-1 hash by providing the local SHA-1 reference as the ETag.
   *
   * **Signature verification object**
   *
   * The response will include a `verification` object that describes the result of verifying the commit's signature. The following fields are included in the `verification` object:
   *
   * | Name | Type | Description |
   * | ---- | ---- | ----------- |
   * | `verified` | `boolean` | Indicates whether GitHub considers the signature in this commit to be verified. |
   * | `reason` | `string` | The reason for verified value. Possible values and their meanings are enumerated in table below. |
   * | `signature` | `string` | The signature that was extracted from the commit. |
   * | `payload` | `string` | The value that was signed. |
   *
   * These are the possible values for `reason` in the `verification` object:
   *
   * | Value | Description |
   * | ----- | ----------- |
   * | `expired_key` | The key that made the signature is expired. |
   * | `not_signing_key` | The "signing" flag is not among the usage flags in the GPG key that made the signature. |
   * | `gpgverify_error` | There was an error communicating with the signature verification service. |
   * | `gpgverify_unavailable` | The signature verification service is currently unavailable. |
   * | `unsigned` | The object does not include a signature. |
   * | `unknown_signature_type` | A non-PGP signature was found in the commit. |
   * | `no_user` | No user was associated with the `committer` email address in the commit. |
   * | `unverified_email` | The `committer` email address in the commit was associated with a user, but the email address is not verified on their account. |
   * | `bad_email` | The `committer` email address in the commit is not included in the identities of the PGP key that made the signature. |
   * | `unknown_key` | The key that made the signature has not been registered with any user's account. |
   * | `malformed_signature` | There was an error parsing the signature. |
   * | `invalid` | The signature could not be cryptographically verified using the key whose key-id was found in the signature. |
   * | `valid` | None of the above errors applied, so the signature is considered to be verified. |
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposGetCommit()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetCommit$Response(params: ReposGetCommit$Params, context?: HttpContext): Observable<StrictHttpResponse<Commit>> {
    return reposGetCommit(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a commit.
   *
   * Returns the contents of a single commit reference. You must have `read` access for the repository to use this endpoint.
   *
   * **Note:** If there are more than 300 files in the commit diff, the response will include pagination link headers for the remaining files, up to a limit of 3000 files. Each page contains the static commit information, and the only changes are to the file listing.
   *
   * You can pass the appropriate [media type](https://docs.github.com/rest/overview/media-types/#commits-commit-comparison-and-pull-requests) to  fetch `diff` and `patch` formats. Diffs with binary data will have no `patch` property.
   *
   * To return only the SHA-1 hash of the commit reference, you can provide the `sha` custom [media type](https://docs.github.com/rest/overview/media-types/#commits-commit-comparison-and-pull-requests) in the `Accept` header. You can use this endpoint to check if a remote reference's SHA-1 hash is the same as your local reference's SHA-1 hash by providing the local SHA-1 reference as the ETag.
   *
   * **Signature verification object**
   *
   * The response will include a `verification` object that describes the result of verifying the commit's signature. The following fields are included in the `verification` object:
   *
   * | Name | Type | Description |
   * | ---- | ---- | ----------- |
   * | `verified` | `boolean` | Indicates whether GitHub considers the signature in this commit to be verified. |
   * | `reason` | `string` | The reason for verified value. Possible values and their meanings are enumerated in table below. |
   * | `signature` | `string` | The signature that was extracted from the commit. |
   * | `payload` | `string` | The value that was signed. |
   *
   * These are the possible values for `reason` in the `verification` object:
   *
   * | Value | Description |
   * | ----- | ----------- |
   * | `expired_key` | The key that made the signature is expired. |
   * | `not_signing_key` | The "signing" flag is not among the usage flags in the GPG key that made the signature. |
   * | `gpgverify_error` | There was an error communicating with the signature verification service. |
   * | `gpgverify_unavailable` | The signature verification service is currently unavailable. |
   * | `unsigned` | The object does not include a signature. |
   * | `unknown_signature_type` | A non-PGP signature was found in the commit. |
   * | `no_user` | No user was associated with the `committer` email address in the commit. |
   * | `unverified_email` | The `committer` email address in the commit was associated with a user, but the email address is not verified on their account. |
   * | `bad_email` | The `committer` email address in the commit is not included in the identities of the PGP key that made the signature. |
   * | `unknown_key` | The key that made the signature has not been registered with any user's account. |
   * | `malformed_signature` | There was an error parsing the signature. |
   * | `invalid` | The signature could not be cryptographically verified using the key whose key-id was found in the signature. |
   * | `valid` | None of the above errors applied, so the signature is considered to be verified. |
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposGetCommit$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetCommit(params: ReposGetCommit$Params, context?: HttpContext): Observable<Commit> {
    return this.reposGetCommit$Response(params, context).pipe(
      map((r: StrictHttpResponse<Commit>): Commit => r.body)
    );
  }

  /** Path part for operation `reposGetCombinedStatusForRef()` */
  static readonly ReposGetCombinedStatusForRefPath = '/repos/{owner}/{repo}/commits/{ref}/status';

  /**
   * Get the combined status for a specific reference.
   *
   * Users with pull access in a repository can access a combined view of commit statuses for a given ref. The ref can be a SHA, a branch name, or a tag name.
   *
   *
   * Additionally, a combined `state` is returned. The `state` is one of:
   *
   * *   **failure** if any of the contexts report as `error` or `failure`
   * *   **pending** if there are no statuses or a context is `pending`
   * *   **success** if the latest status for all contexts is `success`
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposGetCombinedStatusForRef()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetCombinedStatusForRef$Response(params: ReposGetCombinedStatusForRef$Params, context?: HttpContext): Observable<StrictHttpResponse<CombinedCommitStatus>> {
    return reposGetCombinedStatusForRef(this.http, this.rootUrl, params, context);
  }

  /**
   * Get the combined status for a specific reference.
   *
   * Users with pull access in a repository can access a combined view of commit statuses for a given ref. The ref can be a SHA, a branch name, or a tag name.
   *
   *
   * Additionally, a combined `state` is returned. The `state` is one of:
   *
   * *   **failure** if any of the contexts report as `error` or `failure`
   * *   **pending** if there are no statuses or a context is `pending`
   * *   **success** if the latest status for all contexts is `success`
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposGetCombinedStatusForRef$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetCombinedStatusForRef(params: ReposGetCombinedStatusForRef$Params, context?: HttpContext): Observable<CombinedCommitStatus> {
    return this.reposGetCombinedStatusForRef$Response(params, context).pipe(
      map((r: StrictHttpResponse<CombinedCommitStatus>): CombinedCommitStatus => r.body)
    );
  }

  /** Path part for operation `reposListCommitStatusesForRef()` */
  static readonly ReposListCommitStatusesForRefPath = '/repos/{owner}/{repo}/commits/{ref}/statuses';

  /**
   * List commit statuses for a reference.
   *
   * Users with pull access in a repository can view commit statuses for a given ref. The ref can be a SHA, a branch name, or a tag name. Statuses are returned in reverse chronological order. The first status in the list will be the latest one.
   *
   * This resource is also available via a legacy route: `GET /repos/:owner/:repo/statuses/:ref`.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposListCommitStatusesForRef()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposListCommitStatusesForRef$Response(params: ReposListCommitStatusesForRef$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Status>>> {
    return reposListCommitStatusesForRef(this.http, this.rootUrl, params, context);
  }

  /**
   * List commit statuses for a reference.
   *
   * Users with pull access in a repository can view commit statuses for a given ref. The ref can be a SHA, a branch name, or a tag name. Statuses are returned in reverse chronological order. The first status in the list will be the latest one.
   *
   * This resource is also available via a legacy route: `GET /repos/:owner/:repo/statuses/:ref`.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposListCommitStatusesForRef$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposListCommitStatusesForRef(params: ReposListCommitStatusesForRef$Params, context?: HttpContext): Observable<Array<Status>> {
    return this.reposListCommitStatusesForRef$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Status>>): Array<Status> => r.body)
    );
  }

  /** Path part for operation `reposGetCommunityProfileMetrics()` */
  static readonly ReposGetCommunityProfileMetricsPath = '/repos/{owner}/{repo}/community/profile';

  /**
   * Get community profile metrics.
   *
   * Returns all community profile metrics for a repository. The repository cannot be a fork.
   *
   * The returned metrics include an overall health score, the repository description, the presence of documentation, the
   * detected code of conduct, the detected license, and the presence of ISSUE\_TEMPLATE, PULL\_REQUEST\_TEMPLATE,
   * README, and CONTRIBUTING files.
   *
   * The `health_percentage` score is defined as a percentage of how many of
   * these four documents are present: README, CONTRIBUTING, LICENSE, and
   * CODE_OF_CONDUCT. For example, if all four documents are present, then
   * the `health_percentage` is `100`. If only one is present, then the
   * `health_percentage` is `25`.
   *
   * `content_reports_enabled` is only returned for organization-owned repositories.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposGetCommunityProfileMetrics()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetCommunityProfileMetrics$Response(params: ReposGetCommunityProfileMetrics$Params, context?: HttpContext): Observable<StrictHttpResponse<CommunityProfile>> {
    return reposGetCommunityProfileMetrics(this.http, this.rootUrl, params, context);
  }

  /**
   * Get community profile metrics.
   *
   * Returns all community profile metrics for a repository. The repository cannot be a fork.
   *
   * The returned metrics include an overall health score, the repository description, the presence of documentation, the
   * detected code of conduct, the detected license, and the presence of ISSUE\_TEMPLATE, PULL\_REQUEST\_TEMPLATE,
   * README, and CONTRIBUTING files.
   *
   * The `health_percentage` score is defined as a percentage of how many of
   * these four documents are present: README, CONTRIBUTING, LICENSE, and
   * CODE_OF_CONDUCT. For example, if all four documents are present, then
   * the `health_percentage` is `100`. If only one is present, then the
   * `health_percentage` is `25`.
   *
   * `content_reports_enabled` is only returned for organization-owned repositories.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposGetCommunityProfileMetrics$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetCommunityProfileMetrics(params: ReposGetCommunityProfileMetrics$Params, context?: HttpContext): Observable<CommunityProfile> {
    return this.reposGetCommunityProfileMetrics$Response(params, context).pipe(
      map((r: StrictHttpResponse<CommunityProfile>): CommunityProfile => r.body)
    );
  }

  /** Path part for operation `reposCompareCommits()` */
  static readonly ReposCompareCommitsPath = '/repos/{owner}/{repo}/compare/{basehead}';

  /**
   * Compare two commits.
   *
   * Compares two commits against one another. You can compare branches in the same repository, or you can compare branches that exist in different repositories within the same repository network, including fork branches. For more information about how to view a repository's network, see "[Understanding connections between repositories](https://docs.github.com/repositories/viewing-activity-and-data-for-your-repository/understanding-connections-between-repositories)."
   *
   * This endpoint is equivalent to running the `git log BASE..HEAD` command, but it returns commits in a different order. The `git log BASE..HEAD` command returns commits in reverse chronological order, whereas the API returns commits in chronological order. You can pass the appropriate [media type](https://docs.github.com/rest/overview/media-types/#commits-commit-comparison-and-pull-requests) to fetch diff and patch formats.
   *
   * The API response includes details about the files that were changed between the two commits. This includes the status of the change (if a file was added, removed, modified, or renamed), and details of the change itself. For example, files with a `renamed` status have a `previous_filename` field showing the previous filename of the file, and files with a `modified` status have a `patch` field showing the changes made to the file.
   *
   * When calling this endpoint without any paging parameter (`per_page` or `page`), the returned list is limited to 250 commits, and the last commit in the list is the most recent of the entire comparison.
   *
   * **Working with large comparisons**
   *
   * To process a response with a large number of commits, use a query parameter (`per_page` or `page`) to paginate the results. When using pagination:
   *
   * - The list of changed files is only shown on the first page of results, but it includes all changed files for the entire comparison.
   * - The results are returned in chronological order, but the last commit in the returned list may not be the most recent one in the entire set if there are more pages of results.
   *
   * For more information on working with pagination, see "[Using pagination in the REST API](https://docs.github.com/rest/guides/using-pagination-in-the-rest-api)."
   *
   * **Signature verification object**
   *
   * The response will include a `verification` object that describes the result of verifying the commit's signature. The `verification` object includes the following fields:
   *
   * | Name | Type | Description |
   * | ---- | ---- | ----------- |
   * | `verified` | `boolean` | Indicates whether GitHub considers the signature in this commit to be verified. |
   * | `reason` | `string` | The reason for verified value. Possible values and their meanings are enumerated in table below. |
   * | `signature` | `string` | The signature that was extracted from the commit. |
   * | `payload` | `string` | The value that was signed. |
   *
   * These are the possible values for `reason` in the `verification` object:
   *
   * | Value | Description |
   * | ----- | ----------- |
   * | `expired_key` | The key that made the signature is expired. |
   * | `not_signing_key` | The "signing" flag is not among the usage flags in the GPG key that made the signature. |
   * | `gpgverify_error` | There was an error communicating with the signature verification service. |
   * | `gpgverify_unavailable` | The signature verification service is currently unavailable. |
   * | `unsigned` | The object does not include a signature. |
   * | `unknown_signature_type` | A non-PGP signature was found in the commit. |
   * | `no_user` | No user was associated with the `committer` email address in the commit. |
   * | `unverified_email` | The `committer` email address in the commit was associated with a user, but the email address is not verified on their account. |
   * | `bad_email` | The `committer` email address in the commit is not included in the identities of the PGP key that made the signature. |
   * | `unknown_key` | The key that made the signature has not been registered with any user's account. |
   * | `malformed_signature` | There was an error parsing the signature. |
   * | `invalid` | The signature could not be cryptographically verified using the key whose key-id was found in the signature. |
   * | `valid` | None of the above errors applied, so the signature is considered to be verified. |
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposCompareCommits()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposCompareCommits$Response(params: ReposCompareCommits$Params, context?: HttpContext): Observable<StrictHttpResponse<CommitComparison>> {
    return reposCompareCommits(this.http, this.rootUrl, params, context);
  }

  /**
   * Compare two commits.
   *
   * Compares two commits against one another. You can compare branches in the same repository, or you can compare branches that exist in different repositories within the same repository network, including fork branches. For more information about how to view a repository's network, see "[Understanding connections between repositories](https://docs.github.com/repositories/viewing-activity-and-data-for-your-repository/understanding-connections-between-repositories)."
   *
   * This endpoint is equivalent to running the `git log BASE..HEAD` command, but it returns commits in a different order. The `git log BASE..HEAD` command returns commits in reverse chronological order, whereas the API returns commits in chronological order. You can pass the appropriate [media type](https://docs.github.com/rest/overview/media-types/#commits-commit-comparison-and-pull-requests) to fetch diff and patch formats.
   *
   * The API response includes details about the files that were changed between the two commits. This includes the status of the change (if a file was added, removed, modified, or renamed), and details of the change itself. For example, files with a `renamed` status have a `previous_filename` field showing the previous filename of the file, and files with a `modified` status have a `patch` field showing the changes made to the file.
   *
   * When calling this endpoint without any paging parameter (`per_page` or `page`), the returned list is limited to 250 commits, and the last commit in the list is the most recent of the entire comparison.
   *
   * **Working with large comparisons**
   *
   * To process a response with a large number of commits, use a query parameter (`per_page` or `page`) to paginate the results. When using pagination:
   *
   * - The list of changed files is only shown on the first page of results, but it includes all changed files for the entire comparison.
   * - The results are returned in chronological order, but the last commit in the returned list may not be the most recent one in the entire set if there are more pages of results.
   *
   * For more information on working with pagination, see "[Using pagination in the REST API](https://docs.github.com/rest/guides/using-pagination-in-the-rest-api)."
   *
   * **Signature verification object**
   *
   * The response will include a `verification` object that describes the result of verifying the commit's signature. The `verification` object includes the following fields:
   *
   * | Name | Type | Description |
   * | ---- | ---- | ----------- |
   * | `verified` | `boolean` | Indicates whether GitHub considers the signature in this commit to be verified. |
   * | `reason` | `string` | The reason for verified value. Possible values and their meanings are enumerated in table below. |
   * | `signature` | `string` | The signature that was extracted from the commit. |
   * | `payload` | `string` | The value that was signed. |
   *
   * These are the possible values for `reason` in the `verification` object:
   *
   * | Value | Description |
   * | ----- | ----------- |
   * | `expired_key` | The key that made the signature is expired. |
   * | `not_signing_key` | The "signing" flag is not among the usage flags in the GPG key that made the signature. |
   * | `gpgverify_error` | There was an error communicating with the signature verification service. |
   * | `gpgverify_unavailable` | The signature verification service is currently unavailable. |
   * | `unsigned` | The object does not include a signature. |
   * | `unknown_signature_type` | A non-PGP signature was found in the commit. |
   * | `no_user` | No user was associated with the `committer` email address in the commit. |
   * | `unverified_email` | The `committer` email address in the commit was associated with a user, but the email address is not verified on their account. |
   * | `bad_email` | The `committer` email address in the commit is not included in the identities of the PGP key that made the signature. |
   * | `unknown_key` | The key that made the signature has not been registered with any user's account. |
   * | `malformed_signature` | There was an error parsing the signature. |
   * | `invalid` | The signature could not be cryptographically verified using the key whose key-id was found in the signature. |
   * | `valid` | None of the above errors applied, so the signature is considered to be verified. |
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposCompareCommits$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposCompareCommits(params: ReposCompareCommits$Params, context?: HttpContext): Observable<CommitComparison> {
    return this.reposCompareCommits$Response(params, context).pipe(
      map((r: StrictHttpResponse<CommitComparison>): CommitComparison => r.body)
    );
  }

  /** Path part for operation `reposGetContent()` */
  static readonly ReposGetContentPath = '/repos/{owner}/{repo}/contents/{path}';

  /**
   * Get repository content.
   *
   * Gets the contents of a file or directory in a repository. Specify the file path or directory in `:path`. If you omit
   * `:path`, you will receive the contents of the repository's root directory. See the description below regarding what the API response includes for directories. 
   *
   * Files and symlinks support [a custom media type](https://docs.github.com/rest/overview/media-types) for
   * retrieving the raw content or rendered HTML (when supported). All content types support [a custom media
   * type](https://docs.github.com/rest/overview/media-types) to ensure the content is returned in a consistent
   * object format.
   *
   * **Notes**:
   * *   To get a repository's contents recursively, you can [recursively get the tree](https://docs.github.com/rest/git/trees#get-a-tree).
   * *   This API has an upper limit of 1,000 files for a directory. If you need to retrieve more files, use the [Git Trees
   * API](https://docs.github.com/rest/git/trees#get-a-tree).
   *  *  Download URLs expire and are meant to be used just once. To ensure the download URL does not expire, please use the contents API to obtain a fresh download URL for each download.
   *  Size limits:
   * If the requested file's size is:
   * * 1 MB or smaller: All features of this endpoint are supported.
   * * Between 1-100 MB: Only the `raw` or `object` [custom media types](https://docs.github.com/rest/repos/contents#custom-media-types-for-repository-contents) are supported. Both will work as normal, except that when using the `object` media type, the `content` field will be an empty string and the `encoding` field will be `"none"`. To get the contents of these larger files, use the `raw` media type.
   *  * Greater than 100 MB: This endpoint is not supported.
   *
   *  If the content is a directory:
   * The response will be an array of objects, one object for each item in the directory.
   * When listing the contents of a directory, submodules have their "type" specified as "file". Logically, the value
   * _should_ be "submodule". This behavior exists in API v3 [for backwards compatibility purposes](https://git.io/v1YCW).
   * In the next major version of the API, the type will be returned as "submodule".
   *
   *  If the content is a symlink: 
   * If the requested `:path` points to a symlink, and the symlink's target is a normal file in the repository, then the
   * API responds with the content of the file (in the format shown in the example. Otherwise, the API responds with an object 
   * describing the symlink itself.
   *
   *  If the content is a submodule:
   * The `submodule_git_url` identifies the location of the submodule repository, and the `sha` identifies a specific
   * commit within the submodule repository. Git uses the given URL when cloning the submodule repository, and checks out
   * the submodule at that specific commit.
   *
   * If the submodule repository is not hosted on github.com, the Git URLs (`git_url` and `_links["git"]`) and the
   * github.com URLs (`html_url` and `_links["html"]`) will have null values.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposGetContent$VndGithubObject()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetContent$VndGithubObject$Response(params: ReposGetContent$VndGithubObject$Params, context?: HttpContext): Observable<StrictHttpResponse<ContentTree>> {
    return reposGetContent$VndGithubObject(this.http, this.rootUrl, params, context);
  }

  /**
   * Get repository content.
   *
   * Gets the contents of a file or directory in a repository. Specify the file path or directory in `:path`. If you omit
   * `:path`, you will receive the contents of the repository's root directory. See the description below regarding what the API response includes for directories. 
   *
   * Files and symlinks support [a custom media type](https://docs.github.com/rest/overview/media-types) for
   * retrieving the raw content or rendered HTML (when supported). All content types support [a custom media
   * type](https://docs.github.com/rest/overview/media-types) to ensure the content is returned in a consistent
   * object format.
   *
   * **Notes**:
   * *   To get a repository's contents recursively, you can [recursively get the tree](https://docs.github.com/rest/git/trees#get-a-tree).
   * *   This API has an upper limit of 1,000 files for a directory. If you need to retrieve more files, use the [Git Trees
   * API](https://docs.github.com/rest/git/trees#get-a-tree).
   *  *  Download URLs expire and are meant to be used just once. To ensure the download URL does not expire, please use the contents API to obtain a fresh download URL for each download.
   *  Size limits:
   * If the requested file's size is:
   * * 1 MB or smaller: All features of this endpoint are supported.
   * * Between 1-100 MB: Only the `raw` or `object` [custom media types](https://docs.github.com/rest/repos/contents#custom-media-types-for-repository-contents) are supported. Both will work as normal, except that when using the `object` media type, the `content` field will be an empty string and the `encoding` field will be `"none"`. To get the contents of these larger files, use the `raw` media type.
   *  * Greater than 100 MB: This endpoint is not supported.
   *
   *  If the content is a directory:
   * The response will be an array of objects, one object for each item in the directory.
   * When listing the contents of a directory, submodules have their "type" specified as "file". Logically, the value
   * _should_ be "submodule". This behavior exists in API v3 [for backwards compatibility purposes](https://git.io/v1YCW).
   * In the next major version of the API, the type will be returned as "submodule".
   *
   *  If the content is a symlink: 
   * If the requested `:path` points to a symlink, and the symlink's target is a normal file in the repository, then the
   * API responds with the content of the file (in the format shown in the example. Otherwise, the API responds with an object 
   * describing the symlink itself.
   *
   *  If the content is a submodule:
   * The `submodule_git_url` identifies the location of the submodule repository, and the `sha` identifies a specific
   * commit within the submodule repository. Git uses the given URL when cloning the submodule repository, and checks out
   * the submodule at that specific commit.
   *
   * If the submodule repository is not hosted on github.com, the Git URLs (`git_url` and `_links["git"]`) and the
   * github.com URLs (`html_url` and `_links["html"]`) will have null values.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposGetContent$VndGithubObject$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetContent$VndGithubObject(params: ReposGetContent$VndGithubObject$Params, context?: HttpContext): Observable<ContentTree> {
    return this.reposGetContent$VndGithubObject$Response(params, context).pipe(
      map((r: StrictHttpResponse<ContentTree>): ContentTree => r.body)
    );
  }

  /**
   * Get repository content.
   *
   * Gets the contents of a file or directory in a repository. Specify the file path or directory in `:path`. If you omit
   * `:path`, you will receive the contents of the repository's root directory. See the description below regarding what the API response includes for directories. 
   *
   * Files and symlinks support [a custom media type](https://docs.github.com/rest/overview/media-types) for
   * retrieving the raw content or rendered HTML (when supported). All content types support [a custom media
   * type](https://docs.github.com/rest/overview/media-types) to ensure the content is returned in a consistent
   * object format.
   *
   * **Notes**:
   * *   To get a repository's contents recursively, you can [recursively get the tree](https://docs.github.com/rest/git/trees#get-a-tree).
   * *   This API has an upper limit of 1,000 files for a directory. If you need to retrieve more files, use the [Git Trees
   * API](https://docs.github.com/rest/git/trees#get-a-tree).
   *  *  Download URLs expire and are meant to be used just once. To ensure the download URL does not expire, please use the contents API to obtain a fresh download URL for each download.
   *  Size limits:
   * If the requested file's size is:
   * * 1 MB or smaller: All features of this endpoint are supported.
   * * Between 1-100 MB: Only the `raw` or `object` [custom media types](https://docs.github.com/rest/repos/contents#custom-media-types-for-repository-contents) are supported. Both will work as normal, except that when using the `object` media type, the `content` field will be an empty string and the `encoding` field will be `"none"`. To get the contents of these larger files, use the `raw` media type.
   *  * Greater than 100 MB: This endpoint is not supported.
   *
   *  If the content is a directory:
   * The response will be an array of objects, one object for each item in the directory.
   * When listing the contents of a directory, submodules have their "type" specified as "file". Logically, the value
   * _should_ be "submodule". This behavior exists in API v3 [for backwards compatibility purposes](https://git.io/v1YCW).
   * In the next major version of the API, the type will be returned as "submodule".
   *
   *  If the content is a symlink: 
   * If the requested `:path` points to a symlink, and the symlink's target is a normal file in the repository, then the
   * API responds with the content of the file (in the format shown in the example. Otherwise, the API responds with an object 
   * describing the symlink itself.
   *
   *  If the content is a submodule:
   * The `submodule_git_url` identifies the location of the submodule repository, and the `sha` identifies a specific
   * commit within the submodule repository. Git uses the given URL when cloning the submodule repository, and checks out
   * the submodule at that specific commit.
   *
   * If the submodule repository is not hosted on github.com, the Git URLs (`git_url` and `_links["git"]`) and the
   * github.com URLs (`html_url` and `_links["html"]`) will have null values.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposGetContent$Json()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetContent$Json$Response(params: ReposGetContent$Json$Params, context?: HttpContext): Observable<StrictHttpResponse<(ContentDirectory | ContentFile | ContentSymlink | ContentSubmodule)>> {
    return reposGetContent$Json(this.http, this.rootUrl, params, context);
  }

  /**
   * Get repository content.
   *
   * Gets the contents of a file or directory in a repository. Specify the file path or directory in `:path`. If you omit
   * `:path`, you will receive the contents of the repository's root directory. See the description below regarding what the API response includes for directories. 
   *
   * Files and symlinks support [a custom media type](https://docs.github.com/rest/overview/media-types) for
   * retrieving the raw content or rendered HTML (when supported). All content types support [a custom media
   * type](https://docs.github.com/rest/overview/media-types) to ensure the content is returned in a consistent
   * object format.
   *
   * **Notes**:
   * *   To get a repository's contents recursively, you can [recursively get the tree](https://docs.github.com/rest/git/trees#get-a-tree).
   * *   This API has an upper limit of 1,000 files for a directory. If you need to retrieve more files, use the [Git Trees
   * API](https://docs.github.com/rest/git/trees#get-a-tree).
   *  *  Download URLs expire and are meant to be used just once. To ensure the download URL does not expire, please use the contents API to obtain a fresh download URL for each download.
   *  Size limits:
   * If the requested file's size is:
   * * 1 MB or smaller: All features of this endpoint are supported.
   * * Between 1-100 MB: Only the `raw` or `object` [custom media types](https://docs.github.com/rest/repos/contents#custom-media-types-for-repository-contents) are supported. Both will work as normal, except that when using the `object` media type, the `content` field will be an empty string and the `encoding` field will be `"none"`. To get the contents of these larger files, use the `raw` media type.
   *  * Greater than 100 MB: This endpoint is not supported.
   *
   *  If the content is a directory:
   * The response will be an array of objects, one object for each item in the directory.
   * When listing the contents of a directory, submodules have their "type" specified as "file". Logically, the value
   * _should_ be "submodule". This behavior exists in API v3 [for backwards compatibility purposes](https://git.io/v1YCW).
   * In the next major version of the API, the type will be returned as "submodule".
   *
   *  If the content is a symlink: 
   * If the requested `:path` points to a symlink, and the symlink's target is a normal file in the repository, then the
   * API responds with the content of the file (in the format shown in the example. Otherwise, the API responds with an object 
   * describing the symlink itself.
   *
   *  If the content is a submodule:
   * The `submodule_git_url` identifies the location of the submodule repository, and the `sha` identifies a specific
   * commit within the submodule repository. Git uses the given URL when cloning the submodule repository, and checks out
   * the submodule at that specific commit.
   *
   * If the submodule repository is not hosted on github.com, the Git URLs (`git_url` and `_links["git"]`) and the
   * github.com URLs (`html_url` and `_links["html"]`) will have null values.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposGetContent$Json$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetContent$Json(params: ReposGetContent$Json$Params, context?: HttpContext): Observable<(ContentDirectory | ContentFile | ContentSymlink | ContentSubmodule)> {
    return this.reposGetContent$Json$Response(params, context).pipe(
      map((r: StrictHttpResponse<(ContentDirectory | ContentFile | ContentSymlink | ContentSubmodule)>): (ContentDirectory | ContentFile | ContentSymlink | ContentSubmodule) => r.body)
    );
  }

  /** Path part for operation `reposCreateOrUpdateFileContents()` */
  static readonly ReposCreateOrUpdateFileContentsPath = '/repos/{owner}/{repo}/contents/{path}';

  /**
   * Create or update file contents.
   *
   * Creates a new file or replaces an existing file in a repository. You must authenticate using an access token with the `repo` scope to use this endpoint. If you want to modify files in the `.github/workflows` directory, you must authenticate using an access token with the `workflow` scope.
   *
   * **Note:** If you use this endpoint and the "[Delete a file](https://docs.github.com/rest/repos/contents/#delete-a-file)" endpoint in parallel, the concurrent requests will conflict and you will receive errors. You must use these endpoints serially instead.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposCreateOrUpdateFileContents()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposCreateOrUpdateFileContents$Response(params: ReposCreateOrUpdateFileContents$Params, context?: HttpContext): Observable<StrictHttpResponse<FileCommit>> {
    return reposCreateOrUpdateFileContents(this.http, this.rootUrl, params, context);
  }

  /**
   * Create or update file contents.
   *
   * Creates a new file or replaces an existing file in a repository. You must authenticate using an access token with the `repo` scope to use this endpoint. If you want to modify files in the `.github/workflows` directory, you must authenticate using an access token with the `workflow` scope.
   *
   * **Note:** If you use this endpoint and the "[Delete a file](https://docs.github.com/rest/repos/contents/#delete-a-file)" endpoint in parallel, the concurrent requests will conflict and you will receive errors. You must use these endpoints serially instead.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposCreateOrUpdateFileContents$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposCreateOrUpdateFileContents(params: ReposCreateOrUpdateFileContents$Params, context?: HttpContext): Observable<FileCommit> {
    return this.reposCreateOrUpdateFileContents$Response(params, context).pipe(
      map((r: StrictHttpResponse<FileCommit>): FileCommit => r.body)
    );
  }

  /** Path part for operation `reposDeleteFile()` */
  static readonly ReposDeleteFilePath = '/repos/{owner}/{repo}/contents/{path}';

  /**
   * Delete a file.
   *
   * Deletes a file in a repository.
   *
   * You can provide an additional `committer` parameter, which is an object containing information about the committer. Or, you can provide an `author` parameter, which is an object containing information about the author.
   *
   * The `author` section is optional and is filled in with the `committer` information if omitted. If the `committer` information is omitted, the authenticated user's information is used.
   *
   * You must provide values for both `name` and `email`, whether you choose to use `author` or `committer`. Otherwise, you'll receive a `422` status code.
   *
   * **Note:** If you use this endpoint and the "[Create or update file contents](https://docs.github.com/rest/repos/contents/#create-or-update-file-contents)" endpoint in parallel, the concurrent requests will conflict and you will receive errors. You must use these endpoints serially instead.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposDeleteFile()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposDeleteFile$Response(params: ReposDeleteFile$Params, context?: HttpContext): Observable<StrictHttpResponse<FileCommit>> {
    return reposDeleteFile(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete a file.
   *
   * Deletes a file in a repository.
   *
   * You can provide an additional `committer` parameter, which is an object containing information about the committer. Or, you can provide an `author` parameter, which is an object containing information about the author.
   *
   * The `author` section is optional and is filled in with the `committer` information if omitted. If the `committer` information is omitted, the authenticated user's information is used.
   *
   * You must provide values for both `name` and `email`, whether you choose to use `author` or `committer`. Otherwise, you'll receive a `422` status code.
   *
   * **Note:** If you use this endpoint and the "[Create or update file contents](https://docs.github.com/rest/repos/contents/#create-or-update-file-contents)" endpoint in parallel, the concurrent requests will conflict and you will receive errors. You must use these endpoints serially instead.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposDeleteFile$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposDeleteFile(params: ReposDeleteFile$Params, context?: HttpContext): Observable<FileCommit> {
    return this.reposDeleteFile$Response(params, context).pipe(
      map((r: StrictHttpResponse<FileCommit>): FileCommit => r.body)
    );
  }

  /** Path part for operation `reposListContributors()` */
  static readonly ReposListContributorsPath = '/repos/{owner}/{repo}/contributors';

  /**
   * List repository contributors.
   *
   * Lists contributors to the specified repository and sorts them by the number of commits per contributor in descending order. This endpoint may return information that is a few hours old because the GitHub REST API caches contributor data to improve performance.
   *
   * GitHub identifies contributors by author email address. This endpoint groups contribution counts by GitHub user, which includes all associated email addresses. To improve performance, only the first 500 author email addresses in the repository link to GitHub users. The rest will appear as anonymous contributors without associated GitHub user information.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposListContributors()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposListContributors$Response(params: ReposListContributors$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Contributor>>> {
    return reposListContributors(this.http, this.rootUrl, params, context);
  }

  /**
   * List repository contributors.
   *
   * Lists contributors to the specified repository and sorts them by the number of commits per contributor in descending order. This endpoint may return information that is a few hours old because the GitHub REST API caches contributor data to improve performance.
   *
   * GitHub identifies contributors by author email address. This endpoint groups contribution counts by GitHub user, which includes all associated email addresses. To improve performance, only the first 500 author email addresses in the repository link to GitHub users. The rest will appear as anonymous contributors without associated GitHub user information.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposListContributors$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposListContributors(params: ReposListContributors$Params, context?: HttpContext): Observable<Array<Contributor>> {
    return this.reposListContributors$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Contributor>>): Array<Contributor> => r.body)
    );
  }

  /** Path part for operation `reposListDeployments()` */
  static readonly ReposListDeploymentsPath = '/repos/{owner}/{repo}/deployments';

  /**
   * List deployments.
   *
   * Simple filtering of deployments is available via query parameters:
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposListDeployments()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposListDeployments$Response(params: ReposListDeployments$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Deployment>>> {
    return reposListDeployments(this.http, this.rootUrl, params, context);
  }

  /**
   * List deployments.
   *
   * Simple filtering of deployments is available via query parameters:
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposListDeployments$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposListDeployments(params: ReposListDeployments$Params, context?: HttpContext): Observable<Array<Deployment>> {
    return this.reposListDeployments$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Deployment>>): Array<Deployment> => r.body)
    );
  }

  /** Path part for operation `reposCreateDeployment()` */
  static readonly ReposCreateDeploymentPath = '/repos/{owner}/{repo}/deployments';

  /**
   * Create a deployment.
   *
   * Deployments offer a few configurable parameters with certain defaults.
   *
   * The `ref` parameter can be any named branch, tag, or SHA. At GitHub we often deploy branches and verify them
   * before we merge a pull request.
   *
   * The `environment` parameter allows deployments to be issued to different runtime environments. Teams often have
   * multiple environments for verifying their applications, such as `production`, `staging`, and `qa`. This parameter
   * makes it easier to track which environments have requested deployments. The default environment is `production`.
   *
   * The `auto_merge` parameter is used to ensure that the requested ref is not behind the repository's default branch. If
   * the ref _is_ behind the default branch for the repository, we will attempt to merge it for you. If the merge succeeds,
   * the API will return a successful merge commit. If merge conflicts prevent the merge from succeeding, the API will
   * return a failure response.
   *
   * By default, [commit statuses](https://docs.github.com/rest/commits/statuses) for every submitted context must be in a `success`
   * state. The `required_contexts` parameter allows you to specify a subset of contexts that must be `success`, or to
   * specify contexts that have not yet been submitted. You are not required to use commit statuses to deploy. If you do
   * not require any contexts or create any commit statuses, the deployment will always succeed.
   *
   * The `payload` parameter is available for any extra information that a deployment system might need. It is a JSON text
   * field that will be passed on when a deployment event is dispatched.
   *
   * The `task` parameter is used by the deployment system to allow different execution paths. In the web world this might
   * be `deploy:migrations` to run schema changes on the system. In the compiled world this could be a flag to compile an
   * application with debugging enabled.
   *
   * Users with `repo` or `repo_deployment` scopes can create a deployment for a given ref.
   *
   * Merged branch response:
   *
   * You will see this response when GitHub automatically merges the base branch into the topic branch instead of creating
   * a deployment. This auto-merge happens when:
   * *   Auto-merge option is enabled in the repository
   * *   Topic branch does not include the latest changes on the base branch, which is `master` in the response example
   * *   There are no merge conflicts
   *
   * If there are no new commits in the base branch, a new request to create a deployment should give a successful
   * response.
   *
   * Merge conflict response:
   *
   * This error happens when the `auto_merge` option is enabled and when the default branch (in this case `master`), can't
   * be merged into the branch that's being deployed (in this case `topic-branch`), due to merge conflicts.
   *
   * Failed commit status checks:
   *
   * This error happens when the `required_contexts` parameter indicates that one or more contexts need to have a `success`
   * status for the commit to be deployed, but one or more of the required contexts do not have a state of `success`.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposCreateDeployment()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposCreateDeployment$Response(params: ReposCreateDeployment$Params, context?: HttpContext): Observable<StrictHttpResponse<Deployment>> {
    return reposCreateDeployment(this.http, this.rootUrl, params, context);
  }

  /**
   * Create a deployment.
   *
   * Deployments offer a few configurable parameters with certain defaults.
   *
   * The `ref` parameter can be any named branch, tag, or SHA. At GitHub we often deploy branches and verify them
   * before we merge a pull request.
   *
   * The `environment` parameter allows deployments to be issued to different runtime environments. Teams often have
   * multiple environments for verifying their applications, such as `production`, `staging`, and `qa`. This parameter
   * makes it easier to track which environments have requested deployments. The default environment is `production`.
   *
   * The `auto_merge` parameter is used to ensure that the requested ref is not behind the repository's default branch. If
   * the ref _is_ behind the default branch for the repository, we will attempt to merge it for you. If the merge succeeds,
   * the API will return a successful merge commit. If merge conflicts prevent the merge from succeeding, the API will
   * return a failure response.
   *
   * By default, [commit statuses](https://docs.github.com/rest/commits/statuses) for every submitted context must be in a `success`
   * state. The `required_contexts` parameter allows you to specify a subset of contexts that must be `success`, or to
   * specify contexts that have not yet been submitted. You are not required to use commit statuses to deploy. If you do
   * not require any contexts or create any commit statuses, the deployment will always succeed.
   *
   * The `payload` parameter is available for any extra information that a deployment system might need. It is a JSON text
   * field that will be passed on when a deployment event is dispatched.
   *
   * The `task` parameter is used by the deployment system to allow different execution paths. In the web world this might
   * be `deploy:migrations` to run schema changes on the system. In the compiled world this could be a flag to compile an
   * application with debugging enabled.
   *
   * Users with `repo` or `repo_deployment` scopes can create a deployment for a given ref.
   *
   * Merged branch response:
   *
   * You will see this response when GitHub automatically merges the base branch into the topic branch instead of creating
   * a deployment. This auto-merge happens when:
   * *   Auto-merge option is enabled in the repository
   * *   Topic branch does not include the latest changes on the base branch, which is `master` in the response example
   * *   There are no merge conflicts
   *
   * If there are no new commits in the base branch, a new request to create a deployment should give a successful
   * response.
   *
   * Merge conflict response:
   *
   * This error happens when the `auto_merge` option is enabled and when the default branch (in this case `master`), can't
   * be merged into the branch that's being deployed (in this case `topic-branch`), due to merge conflicts.
   *
   * Failed commit status checks:
   *
   * This error happens when the `required_contexts` parameter indicates that one or more contexts need to have a `success`
   * status for the commit to be deployed, but one or more of the required contexts do not have a state of `success`.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposCreateDeployment$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposCreateDeployment(params: ReposCreateDeployment$Params, context?: HttpContext): Observable<Deployment> {
    return this.reposCreateDeployment$Response(params, context).pipe(
      map((r: StrictHttpResponse<Deployment>): Deployment => r.body)
    );
  }

  /** Path part for operation `reposGetDeployment()` */
  static readonly ReposGetDeploymentPath = '/repos/{owner}/{repo}/deployments/{deployment_id}';

  /**
   * Get a deployment.
   *
   *
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposGetDeployment()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetDeployment$Response(params: ReposGetDeployment$Params, context?: HttpContext): Observable<StrictHttpResponse<Deployment>> {
    return reposGetDeployment(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a deployment.
   *
   *
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposGetDeployment$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetDeployment(params: ReposGetDeployment$Params, context?: HttpContext): Observable<Deployment> {
    return this.reposGetDeployment$Response(params, context).pipe(
      map((r: StrictHttpResponse<Deployment>): Deployment => r.body)
    );
  }

  /** Path part for operation `reposDeleteDeployment()` */
  static readonly ReposDeleteDeploymentPath = '/repos/{owner}/{repo}/deployments/{deployment_id}';

  /**
   * Delete a deployment.
   *
   * If the repository only has one deployment, you can delete the deployment regardless of its status. If the repository has more than one deployment, you can only delete inactive deployments. This ensures that repositories with multiple deployments will always have an active deployment. Anyone with `repo` or `repo_deployment` scopes can delete a deployment.
   *
   * To set a deployment as inactive, you must:
   *
   * *   Create a new deployment that is active so that the system has a record of the current state, then delete the previously active deployment.
   * *   Mark the active deployment as inactive by adding any non-successful deployment status.
   *
   * For more information, see "[Create a deployment](https://docs.github.com/rest/deployments/deployments/#create-a-deployment)" and "[Create a deployment status](https://docs.github.com/rest/deployments/statuses#create-a-deployment-status)."
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposDeleteDeployment()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposDeleteDeployment$Response(params: ReposDeleteDeployment$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return reposDeleteDeployment(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete a deployment.
   *
   * If the repository only has one deployment, you can delete the deployment regardless of its status. If the repository has more than one deployment, you can only delete inactive deployments. This ensures that repositories with multiple deployments will always have an active deployment. Anyone with `repo` or `repo_deployment` scopes can delete a deployment.
   *
   * To set a deployment as inactive, you must:
   *
   * *   Create a new deployment that is active so that the system has a record of the current state, then delete the previously active deployment.
   * *   Mark the active deployment as inactive by adding any non-successful deployment status.
   *
   * For more information, see "[Create a deployment](https://docs.github.com/rest/deployments/deployments/#create-a-deployment)" and "[Create a deployment status](https://docs.github.com/rest/deployments/statuses#create-a-deployment-status)."
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposDeleteDeployment$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposDeleteDeployment(params: ReposDeleteDeployment$Params, context?: HttpContext): Observable<void> {
    return this.reposDeleteDeployment$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `reposListDeploymentStatuses()` */
  static readonly ReposListDeploymentStatusesPath = '/repos/{owner}/{repo}/deployments/{deployment_id}/statuses';

  /**
   * List deployment statuses.
   *
   * Users with pull access can view deployment statuses for a deployment:
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposListDeploymentStatuses()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposListDeploymentStatuses$Response(params: ReposListDeploymentStatuses$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<DeploymentStatus>>> {
    return reposListDeploymentStatuses(this.http, this.rootUrl, params, context);
  }

  /**
   * List deployment statuses.
   *
   * Users with pull access can view deployment statuses for a deployment:
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposListDeploymentStatuses$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposListDeploymentStatuses(params: ReposListDeploymentStatuses$Params, context?: HttpContext): Observable<Array<DeploymentStatus>> {
    return this.reposListDeploymentStatuses$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<DeploymentStatus>>): Array<DeploymentStatus> => r.body)
    );
  }

  /** Path part for operation `reposCreateDeploymentStatus()` */
  static readonly ReposCreateDeploymentStatusPath = '/repos/{owner}/{repo}/deployments/{deployment_id}/statuses';

  /**
   * Create a deployment status.
   *
   * Users with `push` access can create deployment statuses for a given deployment.
   *
   * GitHub Apps require `read & write` access to "Deployments" and `read-only` access to "Repo contents" (for private repos). OAuth apps require the `repo_deployment` scope.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposCreateDeploymentStatus()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposCreateDeploymentStatus$Response(params: ReposCreateDeploymentStatus$Params, context?: HttpContext): Observable<StrictHttpResponse<DeploymentStatus>> {
    return reposCreateDeploymentStatus(this.http, this.rootUrl, params, context);
  }

  /**
   * Create a deployment status.
   *
   * Users with `push` access can create deployment statuses for a given deployment.
   *
   * GitHub Apps require `read & write` access to "Deployments" and `read-only` access to "Repo contents" (for private repos). OAuth apps require the `repo_deployment` scope.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposCreateDeploymentStatus$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposCreateDeploymentStatus(params: ReposCreateDeploymentStatus$Params, context?: HttpContext): Observable<DeploymentStatus> {
    return this.reposCreateDeploymentStatus$Response(params, context).pipe(
      map((r: StrictHttpResponse<DeploymentStatus>): DeploymentStatus => r.body)
    );
  }

  /** Path part for operation `reposGetDeploymentStatus()` */
  static readonly ReposGetDeploymentStatusPath = '/repos/{owner}/{repo}/deployments/{deployment_id}/statuses/{status_id}';

  /**
   * Get a deployment status.
   *
   * Users with pull access can view a deployment status for a deployment:
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposGetDeploymentStatus()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetDeploymentStatus$Response(params: ReposGetDeploymentStatus$Params, context?: HttpContext): Observable<StrictHttpResponse<DeploymentStatus>> {
    return reposGetDeploymentStatus(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a deployment status.
   *
   * Users with pull access can view a deployment status for a deployment:
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposGetDeploymentStatus$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetDeploymentStatus(params: ReposGetDeploymentStatus$Params, context?: HttpContext): Observable<DeploymentStatus> {
    return this.reposGetDeploymentStatus$Response(params, context).pipe(
      map((r: StrictHttpResponse<DeploymentStatus>): DeploymentStatus => r.body)
    );
  }

  /** Path part for operation `reposCreateDispatchEvent()` */
  static readonly ReposCreateDispatchEventPath = '/repos/{owner}/{repo}/dispatches';

  /**
   * Create a repository dispatch event.
   *
   * You can use this endpoint to trigger a webhook event called `repository_dispatch` when you want activity that happens outside of GitHub to trigger a GitHub Actions workflow or GitHub App webhook. You must configure your GitHub Actions workflow or GitHub App to run when the `repository_dispatch` event occurs. For an example `repository_dispatch` webhook payload, see "[RepositoryDispatchEvent](https://docs.github.com/webhooks/event-payloads/#repository_dispatch)."
   *
   * The `client_payload` parameter is available for any extra information that your workflow might need. This parameter is a JSON payload that will be passed on when the webhook event is dispatched. For example, the `client_payload` can include a message that a user would like to send using a GitHub Actions workflow. Or the `client_payload` can be used as a test to debug your workflow.
   *
   * This endpoint requires write access to the repository by providing either:
   *
   *   - Personal access tokens with `repo` scope. For more information, see "[Creating a personal access token for the command line](https://docs.github.com/articles/creating-a-personal-access-token-for-the-command-line)" in the GitHub Help documentation.
   *   - GitHub Apps with both `metadata:read` and `contents:read&write` permissions.
   *
   * This input example shows how you can use the `client_payload` as a test to debug your workflow.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposCreateDispatchEvent()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposCreateDispatchEvent$Response(params: ReposCreateDispatchEvent$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return reposCreateDispatchEvent(this.http, this.rootUrl, params, context);
  }

  /**
   * Create a repository dispatch event.
   *
   * You can use this endpoint to trigger a webhook event called `repository_dispatch` when you want activity that happens outside of GitHub to trigger a GitHub Actions workflow or GitHub App webhook. You must configure your GitHub Actions workflow or GitHub App to run when the `repository_dispatch` event occurs. For an example `repository_dispatch` webhook payload, see "[RepositoryDispatchEvent](https://docs.github.com/webhooks/event-payloads/#repository_dispatch)."
   *
   * The `client_payload` parameter is available for any extra information that your workflow might need. This parameter is a JSON payload that will be passed on when the webhook event is dispatched. For example, the `client_payload` can include a message that a user would like to send using a GitHub Actions workflow. Or the `client_payload` can be used as a test to debug your workflow.
   *
   * This endpoint requires write access to the repository by providing either:
   *
   *   - Personal access tokens with `repo` scope. For more information, see "[Creating a personal access token for the command line](https://docs.github.com/articles/creating-a-personal-access-token-for-the-command-line)" in the GitHub Help documentation.
   *   - GitHub Apps with both `metadata:read` and `contents:read&write` permissions.
   *
   * This input example shows how you can use the `client_payload` as a test to debug your workflow.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposCreateDispatchEvent$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposCreateDispatchEvent(params: ReposCreateDispatchEvent$Params, context?: HttpContext): Observable<void> {
    return this.reposCreateDispatchEvent$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `reposGetAllEnvironments()` */
  static readonly ReposGetAllEnvironmentsPath = '/repos/{owner}/{repo}/environments';

  /**
   * List environments.
   *
   * Lists the environments for a repository.
   *
   * Anyone with read access to the repository can use this endpoint. If the repository is private, you must use an access token with the `repo` scope. GitHub Apps must have the `actions:read` permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposGetAllEnvironments()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetAllEnvironments$Response(params: ReposGetAllEnvironments$Params, context?: HttpContext): Observable<StrictHttpResponse<{

/**
 * The number of environments in this repository
 */
'total_count'?: number;
'environments'?: Array<Environment>;
}>> {
    return reposGetAllEnvironments(this.http, this.rootUrl, params, context);
  }

  /**
   * List environments.
   *
   * Lists the environments for a repository.
   *
   * Anyone with read access to the repository can use this endpoint. If the repository is private, you must use an access token with the `repo` scope. GitHub Apps must have the `actions:read` permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposGetAllEnvironments$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetAllEnvironments(params: ReposGetAllEnvironments$Params, context?: HttpContext): Observable<{

/**
 * The number of environments in this repository
 */
'total_count'?: number;
'environments'?: Array<Environment>;
}> {
    return this.reposGetAllEnvironments$Response(params, context).pipe(
      map((r: StrictHttpResponse<{

/**
 * The number of environments in this repository
 */
'total_count'?: number;
'environments'?: Array<Environment>;
}>): {

/**
 * The number of environments in this repository
 */
'total_count'?: number;
'environments'?: Array<Environment>;
} => r.body)
    );
  }

  /** Path part for operation `reposGetEnvironment()` */
  static readonly ReposGetEnvironmentPath = '/repos/{owner}/{repo}/environments/{environment_name}';

  /**
   * Get an environment.
   *
   * **Note:** To get information about name patterns that branches must match in order to deploy to this environment, see "[Get a deployment branch policy](/rest/deployments/branch-policies#get-a-deployment-branch-policy)."
   *
   * Anyone with read access to the repository can use this endpoint. If the
   * repository is private, you must use an access token with the `repo` scope. GitHub
   * Apps must have the `actions:read` permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposGetEnvironment()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetEnvironment$Response(params: ReposGetEnvironment$Params, context?: HttpContext): Observable<StrictHttpResponse<Environment>> {
    return reposGetEnvironment(this.http, this.rootUrl, params, context);
  }

  /**
   * Get an environment.
   *
   * **Note:** To get information about name patterns that branches must match in order to deploy to this environment, see "[Get a deployment branch policy](/rest/deployments/branch-policies#get-a-deployment-branch-policy)."
   *
   * Anyone with read access to the repository can use this endpoint. If the
   * repository is private, you must use an access token with the `repo` scope. GitHub
   * Apps must have the `actions:read` permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposGetEnvironment$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetEnvironment(params: ReposGetEnvironment$Params, context?: HttpContext): Observable<Environment> {
    return this.reposGetEnvironment$Response(params, context).pipe(
      map((r: StrictHttpResponse<Environment>): Environment => r.body)
    );
  }

  /** Path part for operation `reposCreateOrUpdateEnvironment()` */
  static readonly ReposCreateOrUpdateEnvironmentPath = '/repos/{owner}/{repo}/environments/{environment_name}';

  /**
   * Create or update an environment.
   *
   * Create or update an environment with protection rules, such as required reviewers. For more information about environment protection rules, see "[Environments](/actions/reference/environments#environment-protection-rules)."
   *
   * **Note:** To create or update name patterns that branches must match in order to deploy to this environment, see "[Deployment branch policies](/rest/deployments/branch-policies)."
   *
   * **Note:** To create or update secrets for an environment, see "[GitHub Actions secrets](/rest/actions/secrets)."
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint. GitHub Apps must have the `administration:write` permission for the repository to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposCreateOrUpdateEnvironment()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposCreateOrUpdateEnvironment$Response(params: ReposCreateOrUpdateEnvironment$Params, context?: HttpContext): Observable<StrictHttpResponse<Environment>> {
    return reposCreateOrUpdateEnvironment(this.http, this.rootUrl, params, context);
  }

  /**
   * Create or update an environment.
   *
   * Create or update an environment with protection rules, such as required reviewers. For more information about environment protection rules, see "[Environments](/actions/reference/environments#environment-protection-rules)."
   *
   * **Note:** To create or update name patterns that branches must match in order to deploy to this environment, see "[Deployment branch policies](/rest/deployments/branch-policies)."
   *
   * **Note:** To create or update secrets for an environment, see "[GitHub Actions secrets](/rest/actions/secrets)."
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint. GitHub Apps must have the `administration:write` permission for the repository to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposCreateOrUpdateEnvironment$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposCreateOrUpdateEnvironment(params: ReposCreateOrUpdateEnvironment$Params, context?: HttpContext): Observable<Environment> {
    return this.reposCreateOrUpdateEnvironment$Response(params, context).pipe(
      map((r: StrictHttpResponse<Environment>): Environment => r.body)
    );
  }

  /** Path part for operation `reposDeleteAnEnvironment()` */
  static readonly ReposDeleteAnEnvironmentPath = '/repos/{owner}/{repo}/environments/{environment_name}';

  /**
   * Delete an environment.
   *
   * You must authenticate using an access token with the repo scope to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposDeleteAnEnvironment()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposDeleteAnEnvironment$Response(params: ReposDeleteAnEnvironment$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return reposDeleteAnEnvironment(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete an environment.
   *
   * You must authenticate using an access token with the repo scope to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposDeleteAnEnvironment$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposDeleteAnEnvironment(params: ReposDeleteAnEnvironment$Params, context?: HttpContext): Observable<void> {
    return this.reposDeleteAnEnvironment$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `reposListDeploymentBranchPolicies()` */
  static readonly ReposListDeploymentBranchPoliciesPath = '/repos/{owner}/{repo}/environments/{environment_name}/deployment-branch-policies';

  /**
   * List deployment branch policies.
   *
   * Lists the deployment branch policies for an environment.
   *
   * Anyone with read access to the repository can use this endpoint. If the repository is private, you must use an access token with the `repo` scope. GitHub Apps must have the `actions:read` permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposListDeploymentBranchPolicies()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposListDeploymentBranchPolicies$Response(params: ReposListDeploymentBranchPolicies$Params, context?: HttpContext): Observable<StrictHttpResponse<{

/**
 * The number of deployment branch policies for the environment.
 */
'total_count': number;
'branch_policies': Array<DeploymentBranchPolicy>;
}>> {
    return reposListDeploymentBranchPolicies(this.http, this.rootUrl, params, context);
  }

  /**
   * List deployment branch policies.
   *
   * Lists the deployment branch policies for an environment.
   *
   * Anyone with read access to the repository can use this endpoint. If the repository is private, you must use an access token with the `repo` scope. GitHub Apps must have the `actions:read` permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposListDeploymentBranchPolicies$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposListDeploymentBranchPolicies(params: ReposListDeploymentBranchPolicies$Params, context?: HttpContext): Observable<{

/**
 * The number of deployment branch policies for the environment.
 */
'total_count': number;
'branch_policies': Array<DeploymentBranchPolicy>;
}> {
    return this.reposListDeploymentBranchPolicies$Response(params, context).pipe(
      map((r: StrictHttpResponse<{

/**
 * The number of deployment branch policies for the environment.
 */
'total_count': number;
'branch_policies': Array<DeploymentBranchPolicy>;
}>): {

/**
 * The number of deployment branch policies for the environment.
 */
'total_count': number;
'branch_policies': Array<DeploymentBranchPolicy>;
} => r.body)
    );
  }

  /** Path part for operation `reposCreateDeploymentBranchPolicy()` */
  static readonly ReposCreateDeploymentBranchPolicyPath = '/repos/{owner}/{repo}/environments/{environment_name}/deployment-branch-policies';

  /**
   * Create a deployment branch policy.
   *
   * Creates a deployment branch policy for an environment.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint. GitHub Apps must have the `administration:write` permission for the repository to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposCreateDeploymentBranchPolicy()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposCreateDeploymentBranchPolicy$Response(params: ReposCreateDeploymentBranchPolicy$Params, context?: HttpContext): Observable<StrictHttpResponse<DeploymentBranchPolicy>> {
    return reposCreateDeploymentBranchPolicy(this.http, this.rootUrl, params, context);
  }

  /**
   * Create a deployment branch policy.
   *
   * Creates a deployment branch policy for an environment.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint. GitHub Apps must have the `administration:write` permission for the repository to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposCreateDeploymentBranchPolicy$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposCreateDeploymentBranchPolicy(params: ReposCreateDeploymentBranchPolicy$Params, context?: HttpContext): Observable<DeploymentBranchPolicy> {
    return this.reposCreateDeploymentBranchPolicy$Response(params, context).pipe(
      map((r: StrictHttpResponse<DeploymentBranchPolicy>): DeploymentBranchPolicy => r.body)
    );
  }

  /** Path part for operation `reposGetDeploymentBranchPolicy()` */
  static readonly ReposGetDeploymentBranchPolicyPath = '/repos/{owner}/{repo}/environments/{environment_name}/deployment-branch-policies/{branch_policy_id}';

  /**
   * Get a deployment branch policy.
   *
   * Gets a deployment branch policy for an environment.
   *
   * Anyone with read access to the repository can use this endpoint. If the repository is private, you must use an access token with the `repo` scope. GitHub Apps must have the `actions:read` permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposGetDeploymentBranchPolicy()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetDeploymentBranchPolicy$Response(params: ReposGetDeploymentBranchPolicy$Params, context?: HttpContext): Observable<StrictHttpResponse<DeploymentBranchPolicy>> {
    return reposGetDeploymentBranchPolicy(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a deployment branch policy.
   *
   * Gets a deployment branch policy for an environment.
   *
   * Anyone with read access to the repository can use this endpoint. If the repository is private, you must use an access token with the `repo` scope. GitHub Apps must have the `actions:read` permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposGetDeploymentBranchPolicy$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetDeploymentBranchPolicy(params: ReposGetDeploymentBranchPolicy$Params, context?: HttpContext): Observable<DeploymentBranchPolicy> {
    return this.reposGetDeploymentBranchPolicy$Response(params, context).pipe(
      map((r: StrictHttpResponse<DeploymentBranchPolicy>): DeploymentBranchPolicy => r.body)
    );
  }

  /** Path part for operation `reposUpdateDeploymentBranchPolicy()` */
  static readonly ReposUpdateDeploymentBranchPolicyPath = '/repos/{owner}/{repo}/environments/{environment_name}/deployment-branch-policies/{branch_policy_id}';

  /**
   * Update a deployment branch policy.
   *
   * Updates a deployment branch policy for an environment.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint. GitHub Apps must have the `administration:write` permission for the repository to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposUpdateDeploymentBranchPolicy()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposUpdateDeploymentBranchPolicy$Response(params: ReposUpdateDeploymentBranchPolicy$Params, context?: HttpContext): Observable<StrictHttpResponse<DeploymentBranchPolicy>> {
    return reposUpdateDeploymentBranchPolicy(this.http, this.rootUrl, params, context);
  }

  /**
   * Update a deployment branch policy.
   *
   * Updates a deployment branch policy for an environment.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint. GitHub Apps must have the `administration:write` permission for the repository to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposUpdateDeploymentBranchPolicy$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposUpdateDeploymentBranchPolicy(params: ReposUpdateDeploymentBranchPolicy$Params, context?: HttpContext): Observable<DeploymentBranchPolicy> {
    return this.reposUpdateDeploymentBranchPolicy$Response(params, context).pipe(
      map((r: StrictHttpResponse<DeploymentBranchPolicy>): DeploymentBranchPolicy => r.body)
    );
  }

  /** Path part for operation `reposDeleteDeploymentBranchPolicy()` */
  static readonly ReposDeleteDeploymentBranchPolicyPath = '/repos/{owner}/{repo}/environments/{environment_name}/deployment-branch-policies/{branch_policy_id}';

  /**
   * Delete a deployment branch policy.
   *
   * Deletes a deployment branch policy for an environment.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint. GitHub Apps must have the `administration:write` permission for the repository to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposDeleteDeploymentBranchPolicy()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposDeleteDeploymentBranchPolicy$Response(params: ReposDeleteDeploymentBranchPolicy$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return reposDeleteDeploymentBranchPolicy(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete a deployment branch policy.
   *
   * Deletes a deployment branch policy for an environment.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint. GitHub Apps must have the `administration:write` permission for the repository to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposDeleteDeploymentBranchPolicy$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposDeleteDeploymentBranchPolicy(params: ReposDeleteDeploymentBranchPolicy$Params, context?: HttpContext): Observable<void> {
    return this.reposDeleteDeploymentBranchPolicy$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `reposGetAllDeploymentProtectionRules()` */
  static readonly ReposGetAllDeploymentProtectionRulesPath = '/repos/{owner}/{repo}/environments/{environment_name}/deployment_protection_rules';

  /**
   * Get all deployment protection rules for an environment.
   *
   * Gets all custom deployment protection rules that are enabled for an environment. Anyone with read access to the repository can use this endpoint. If the repository is private and you want to use a personal access token (classic), you must use an access token with the `repo` scope. GitHub Apps and fine-grained personal access tokens must have the `actions:read` permission to use this endpoint. For more information about environments, see "[Using environments for deployment](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)."
   *
   * For more information about the app that is providing this custom deployment rule, see the [documentation for the `GET /apps/{app_slug}` endpoint](https://docs.github.com/rest/apps/apps#get-an-app).
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposGetAllDeploymentProtectionRules()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetAllDeploymentProtectionRules$Response(params: ReposGetAllDeploymentProtectionRules$Params, context?: HttpContext): Observable<StrictHttpResponse<{

/**
 * The number of enabled custom deployment protection rules for this environment
 */
'total_count'?: number;
'custom_deployment_protection_rules'?: Array<DeploymentProtectionRule>;
}>> {
    return reposGetAllDeploymentProtectionRules(this.http, this.rootUrl, params, context);
  }

  /**
   * Get all deployment protection rules for an environment.
   *
   * Gets all custom deployment protection rules that are enabled for an environment. Anyone with read access to the repository can use this endpoint. If the repository is private and you want to use a personal access token (classic), you must use an access token with the `repo` scope. GitHub Apps and fine-grained personal access tokens must have the `actions:read` permission to use this endpoint. For more information about environments, see "[Using environments for deployment](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)."
   *
   * For more information about the app that is providing this custom deployment rule, see the [documentation for the `GET /apps/{app_slug}` endpoint](https://docs.github.com/rest/apps/apps#get-an-app).
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposGetAllDeploymentProtectionRules$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetAllDeploymentProtectionRules(params: ReposGetAllDeploymentProtectionRules$Params, context?: HttpContext): Observable<{

/**
 * The number of enabled custom deployment protection rules for this environment
 */
'total_count'?: number;
'custom_deployment_protection_rules'?: Array<DeploymentProtectionRule>;
}> {
    return this.reposGetAllDeploymentProtectionRules$Response(params, context).pipe(
      map((r: StrictHttpResponse<{

/**
 * The number of enabled custom deployment protection rules for this environment
 */
'total_count'?: number;
'custom_deployment_protection_rules'?: Array<DeploymentProtectionRule>;
}>): {

/**
 * The number of enabled custom deployment protection rules for this environment
 */
'total_count'?: number;
'custom_deployment_protection_rules'?: Array<DeploymentProtectionRule>;
} => r.body)
    );
  }

  /** Path part for operation `reposCreateDeploymentProtectionRule()` */
  static readonly ReposCreateDeploymentProtectionRulePath = '/repos/{owner}/{repo}/environments/{environment_name}/deployment_protection_rules';

  /**
   * Create a custom deployment protection rule on an environment.
   *
   * Enable a custom deployment protection rule for an environment.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint. Enabling a custom protection rule requires admin or owner permissions to the repository. GitHub Apps must have the `actions:write` permission to use this endpoint.
   *
   * For more information about the app that is providing this custom deployment rule, see the [documentation for the `GET /apps/{app_slug}` endpoint](https://docs.github.com/rest/apps/apps#get-an-app).
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposCreateDeploymentProtectionRule()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposCreateDeploymentProtectionRule$Response(params: ReposCreateDeploymentProtectionRule$Params, context?: HttpContext): Observable<StrictHttpResponse<DeploymentProtectionRule>> {
    return reposCreateDeploymentProtectionRule(this.http, this.rootUrl, params, context);
  }

  /**
   * Create a custom deployment protection rule on an environment.
   *
   * Enable a custom deployment protection rule for an environment.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint. Enabling a custom protection rule requires admin or owner permissions to the repository. GitHub Apps must have the `actions:write` permission to use this endpoint.
   *
   * For more information about the app that is providing this custom deployment rule, see the [documentation for the `GET /apps/{app_slug}` endpoint](https://docs.github.com/rest/apps/apps#get-an-app).
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposCreateDeploymentProtectionRule$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposCreateDeploymentProtectionRule(params: ReposCreateDeploymentProtectionRule$Params, context?: HttpContext): Observable<DeploymentProtectionRule> {
    return this.reposCreateDeploymentProtectionRule$Response(params, context).pipe(
      map((r: StrictHttpResponse<DeploymentProtectionRule>): DeploymentProtectionRule => r.body)
    );
  }

  /** Path part for operation `reposListCustomDeploymentRuleIntegrations()` */
  static readonly ReposListCustomDeploymentRuleIntegrationsPath = '/repos/{owner}/{repo}/environments/{environment_name}/deployment_protection_rules/apps';

  /**
   * List custom deployment rule integrations available for an environment.
   *
   * Gets all custom deployment protection rule integrations that are available for an environment. Anyone with read access to the repository can use this endpoint. If the repository is private and you want to use a personal access token (classic), you must use an access token with the `repo` scope. GitHub Apps and fine-grained personal access tokens must have the `actions:read` permission to use this endpoint.
   *
   * For more information about environments, see "[Using environments for deployment](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)."
   *
   * For more information about the app that is providing this custom deployment rule, see "[GET an app](https://docs.github.com/rest/apps/apps#get-an-app)".
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposListCustomDeploymentRuleIntegrations()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposListCustomDeploymentRuleIntegrations$Response(params: ReposListCustomDeploymentRuleIntegrations$Params, context?: HttpContext): Observable<StrictHttpResponse<{

/**
 * The total number of custom deployment protection rule integrations available for this environment.
 */
'total_count'?: number;
'available_custom_deployment_protection_rule_integrations'?: Array<CustomDeploymentRuleApp>;
}>> {
    return reposListCustomDeploymentRuleIntegrations(this.http, this.rootUrl, params, context);
  }

  /**
   * List custom deployment rule integrations available for an environment.
   *
   * Gets all custom deployment protection rule integrations that are available for an environment. Anyone with read access to the repository can use this endpoint. If the repository is private and you want to use a personal access token (classic), you must use an access token with the `repo` scope. GitHub Apps and fine-grained personal access tokens must have the `actions:read` permission to use this endpoint.
   *
   * For more information about environments, see "[Using environments for deployment](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)."
   *
   * For more information about the app that is providing this custom deployment rule, see "[GET an app](https://docs.github.com/rest/apps/apps#get-an-app)".
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposListCustomDeploymentRuleIntegrations$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposListCustomDeploymentRuleIntegrations(params: ReposListCustomDeploymentRuleIntegrations$Params, context?: HttpContext): Observable<{

/**
 * The total number of custom deployment protection rule integrations available for this environment.
 */
'total_count'?: number;
'available_custom_deployment_protection_rule_integrations'?: Array<CustomDeploymentRuleApp>;
}> {
    return this.reposListCustomDeploymentRuleIntegrations$Response(params, context).pipe(
      map((r: StrictHttpResponse<{

/**
 * The total number of custom deployment protection rule integrations available for this environment.
 */
'total_count'?: number;
'available_custom_deployment_protection_rule_integrations'?: Array<CustomDeploymentRuleApp>;
}>): {

/**
 * The total number of custom deployment protection rule integrations available for this environment.
 */
'total_count'?: number;
'available_custom_deployment_protection_rule_integrations'?: Array<CustomDeploymentRuleApp>;
} => r.body)
    );
  }

  /** Path part for operation `reposGetCustomDeploymentProtectionRule()` */
  static readonly ReposGetCustomDeploymentProtectionRulePath = '/repos/{owner}/{repo}/environments/{environment_name}/deployment_protection_rules/{protection_rule_id}';

  /**
   * Get a custom deployment protection rule.
   *
   * Gets an enabled custom deployment protection rule for an environment. Anyone with read access to the repository can use this endpoint. If the repository is private and you want to use a personal access token (classic), you must use an access token with the `repo` scope. GitHub Apps and fine-grained personal access tokens must have the `actions:read` permission to use this endpoint. For more information about environments, see "[Using environments for deployment](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)."
   *
   * For more information about the app that is providing this custom deployment rule, see [`GET /apps/{app_slug}`](https://docs.github.com/rest/apps/apps#get-an-app).
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposGetCustomDeploymentProtectionRule()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetCustomDeploymentProtectionRule$Response(params: ReposGetCustomDeploymentProtectionRule$Params, context?: HttpContext): Observable<StrictHttpResponse<DeploymentProtectionRule>> {
    return reposGetCustomDeploymentProtectionRule(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a custom deployment protection rule.
   *
   * Gets an enabled custom deployment protection rule for an environment. Anyone with read access to the repository can use this endpoint. If the repository is private and you want to use a personal access token (classic), you must use an access token with the `repo` scope. GitHub Apps and fine-grained personal access tokens must have the `actions:read` permission to use this endpoint. For more information about environments, see "[Using environments for deployment](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)."
   *
   * For more information about the app that is providing this custom deployment rule, see [`GET /apps/{app_slug}`](https://docs.github.com/rest/apps/apps#get-an-app).
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposGetCustomDeploymentProtectionRule$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetCustomDeploymentProtectionRule(params: ReposGetCustomDeploymentProtectionRule$Params, context?: HttpContext): Observable<DeploymentProtectionRule> {
    return this.reposGetCustomDeploymentProtectionRule$Response(params, context).pipe(
      map((r: StrictHttpResponse<DeploymentProtectionRule>): DeploymentProtectionRule => r.body)
    );
  }

  /** Path part for operation `reposDisableDeploymentProtectionRule()` */
  static readonly ReposDisableDeploymentProtectionRulePath = '/repos/{owner}/{repo}/environments/{environment_name}/deployment_protection_rules/{protection_rule_id}';

  /**
   * Disable a custom protection rule for an environment.
   *
   * Disables a custom deployment protection rule for an environment.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint. Removing a custom protection rule requires admin or owner permissions to the repository. GitHub Apps must have the `actions:write` permission to use this endpoint. For more information, see "[Get an app](https://docs.github.com/rest/apps/apps#get-an-app)".
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposDisableDeploymentProtectionRule()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposDisableDeploymentProtectionRule$Response(params: ReposDisableDeploymentProtectionRule$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return reposDisableDeploymentProtectionRule(this.http, this.rootUrl, params, context);
  }

  /**
   * Disable a custom protection rule for an environment.
   *
   * Disables a custom deployment protection rule for an environment.
   *
   * You must authenticate using an access token with the `repo` scope to use this endpoint. Removing a custom protection rule requires admin or owner permissions to the repository. GitHub Apps must have the `actions:write` permission to use this endpoint. For more information, see "[Get an app](https://docs.github.com/rest/apps/apps#get-an-app)".
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposDisableDeploymentProtectionRule$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposDisableDeploymentProtectionRule(params: ReposDisableDeploymentProtectionRule$Params, context?: HttpContext): Observable<void> {
    return this.reposDisableDeploymentProtectionRule$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `reposListForks()` */
  static readonly ReposListForksPath = '/repos/{owner}/{repo}/forks';

  /**
   * List forks.
   *
   *
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposListForks()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposListForks$Response(params: ReposListForks$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<MinimalRepository>>> {
    return reposListForks(this.http, this.rootUrl, params, context);
  }

  /**
   * List forks.
   *
   *
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposListForks$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposListForks(params: ReposListForks$Params, context?: HttpContext): Observable<Array<MinimalRepository>> {
    return this.reposListForks$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<MinimalRepository>>): Array<MinimalRepository> => r.body)
    );
  }

  /** Path part for operation `reposCreateFork()` */
  static readonly ReposCreateForkPath = '/repos/{owner}/{repo}/forks';

  /**
   * Create a fork.
   *
   * Create a fork for the authenticated user.
   *
   * **Note**: Forking a Repository happens asynchronously. You may have to wait a short period of time before you can access the git objects. If this takes longer than 5 minutes, be sure to contact [GitHub Support](https://support.github.com/contact?tags=dotcom-rest-api).
   *
   * **Note**: Although this endpoint works with GitHub Apps, the GitHub App must be installed on the destination account with access to all repositories and on the source account with access to the source repository.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposCreateFork()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposCreateFork$Response(params: ReposCreateFork$Params, context?: HttpContext): Observable<StrictHttpResponse<FullRepository>> {
    return reposCreateFork(this.http, this.rootUrl, params, context);
  }

  /**
   * Create a fork.
   *
   * Create a fork for the authenticated user.
   *
   * **Note**: Forking a Repository happens asynchronously. You may have to wait a short period of time before you can access the git objects. If this takes longer than 5 minutes, be sure to contact [GitHub Support](https://support.github.com/contact?tags=dotcom-rest-api).
   *
   * **Note**: Although this endpoint works with GitHub Apps, the GitHub App must be installed on the destination account with access to all repositories and on the source account with access to the source repository.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposCreateFork$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposCreateFork(params: ReposCreateFork$Params, context?: HttpContext): Observable<FullRepository> {
    return this.reposCreateFork$Response(params, context).pipe(
      map((r: StrictHttpResponse<FullRepository>): FullRepository => r.body)
    );
  }

  /** Path part for operation `reposListWebhooks()` */
  static readonly ReposListWebhooksPath = '/repos/{owner}/{repo}/hooks';

  /**
   * List repository webhooks.
   *
   * Lists webhooks for a repository. `last response` may return null if there have not been any deliveries within 30 days.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposListWebhooks()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposListWebhooks$Response(params: ReposListWebhooks$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Hook>>> {
    return reposListWebhooks(this.http, this.rootUrl, params, context);
  }

  /**
   * List repository webhooks.
   *
   * Lists webhooks for a repository. `last response` may return null if there have not been any deliveries within 30 days.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposListWebhooks$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposListWebhooks(params: ReposListWebhooks$Params, context?: HttpContext): Observable<Array<Hook>> {
    return this.reposListWebhooks$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Hook>>): Array<Hook> => r.body)
    );
  }

  /** Path part for operation `reposCreateWebhook()` */
  static readonly ReposCreateWebhookPath = '/repos/{owner}/{repo}/hooks';

  /**
   * Create a repository webhook.
   *
   * Repositories can have multiple webhooks installed. Each webhook should have a unique `config`. Multiple webhooks can
   * share the same `config` as long as those webhooks do not have any `events` that overlap.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposCreateWebhook()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposCreateWebhook$Response(params: ReposCreateWebhook$Params, context?: HttpContext): Observable<StrictHttpResponse<Hook>> {
    return reposCreateWebhook(this.http, this.rootUrl, params, context);
  }

  /**
   * Create a repository webhook.
   *
   * Repositories can have multiple webhooks installed. Each webhook should have a unique `config`. Multiple webhooks can
   * share the same `config` as long as those webhooks do not have any `events` that overlap.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposCreateWebhook$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposCreateWebhook(params: ReposCreateWebhook$Params, context?: HttpContext): Observable<Hook> {
    return this.reposCreateWebhook$Response(params, context).pipe(
      map((r: StrictHttpResponse<Hook>): Hook => r.body)
    );
  }

  /** Path part for operation `reposGetWebhook()` */
  static readonly ReposGetWebhookPath = '/repos/{owner}/{repo}/hooks/{hook_id}';

  /**
   * Get a repository webhook.
   *
   * Returns a webhook configured in a repository. To get only the webhook `config` properties, see "[Get a webhook configuration for a repository](/rest/webhooks/repo-config#get-a-webhook-configuration-for-a-repository)."
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposGetWebhook()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetWebhook$Response(params: ReposGetWebhook$Params, context?: HttpContext): Observable<StrictHttpResponse<Hook>> {
    return reposGetWebhook(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a repository webhook.
   *
   * Returns a webhook configured in a repository. To get only the webhook `config` properties, see "[Get a webhook configuration for a repository](/rest/webhooks/repo-config#get-a-webhook-configuration-for-a-repository)."
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposGetWebhook$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetWebhook(params: ReposGetWebhook$Params, context?: HttpContext): Observable<Hook> {
    return this.reposGetWebhook$Response(params, context).pipe(
      map((r: StrictHttpResponse<Hook>): Hook => r.body)
    );
  }

  /** Path part for operation `reposDeleteWebhook()` */
  static readonly ReposDeleteWebhookPath = '/repos/{owner}/{repo}/hooks/{hook_id}';

  /**
   * Delete a repository webhook.
   *
   *
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposDeleteWebhook()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposDeleteWebhook$Response(params: ReposDeleteWebhook$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return reposDeleteWebhook(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete a repository webhook.
   *
   *
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposDeleteWebhook$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposDeleteWebhook(params: ReposDeleteWebhook$Params, context?: HttpContext): Observable<void> {
    return this.reposDeleteWebhook$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `reposUpdateWebhook()` */
  static readonly ReposUpdateWebhookPath = '/repos/{owner}/{repo}/hooks/{hook_id}';

  /**
   * Update a repository webhook.
   *
   * Updates a webhook configured in a repository. If you previously had a `secret` set, you must provide the same `secret` or set a new `secret` or the secret will be removed. If you are only updating individual webhook `config` properties, use "[Update a webhook configuration for a repository](/rest/webhooks/repo-config#update-a-webhook-configuration-for-a-repository)."
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposUpdateWebhook()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposUpdateWebhook$Response(params: ReposUpdateWebhook$Params, context?: HttpContext): Observable<StrictHttpResponse<Hook>> {
    return reposUpdateWebhook(this.http, this.rootUrl, params, context);
  }

  /**
   * Update a repository webhook.
   *
   * Updates a webhook configured in a repository. If you previously had a `secret` set, you must provide the same `secret` or set a new `secret` or the secret will be removed. If you are only updating individual webhook `config` properties, use "[Update a webhook configuration for a repository](/rest/webhooks/repo-config#update-a-webhook-configuration-for-a-repository)."
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposUpdateWebhook$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposUpdateWebhook(params: ReposUpdateWebhook$Params, context?: HttpContext): Observable<Hook> {
    return this.reposUpdateWebhook$Response(params, context).pipe(
      map((r: StrictHttpResponse<Hook>): Hook => r.body)
    );
  }

  /** Path part for operation `reposGetWebhookConfigForRepo()` */
  static readonly ReposGetWebhookConfigForRepoPath = '/repos/{owner}/{repo}/hooks/{hook_id}/config';

  /**
   * Get a webhook configuration for a repository.
   *
   * Returns the webhook configuration for a repository. To get more information about the webhook, including the `active` state and `events`, use "[Get a repository webhook](/rest/webhooks/repos#get-a-repository-webhook)."
   *
   * Access tokens must have the `read:repo_hook` or `repo` scope, and GitHub Apps must have the `repository_hooks:read` permission.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposGetWebhookConfigForRepo()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetWebhookConfigForRepo$Response(params: ReposGetWebhookConfigForRepo$Params, context?: HttpContext): Observable<StrictHttpResponse<WebhookConfig>> {
    return reposGetWebhookConfigForRepo(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a webhook configuration for a repository.
   *
   * Returns the webhook configuration for a repository. To get more information about the webhook, including the `active` state and `events`, use "[Get a repository webhook](/rest/webhooks/repos#get-a-repository-webhook)."
   *
   * Access tokens must have the `read:repo_hook` or `repo` scope, and GitHub Apps must have the `repository_hooks:read` permission.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposGetWebhookConfigForRepo$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetWebhookConfigForRepo(params: ReposGetWebhookConfigForRepo$Params, context?: HttpContext): Observable<WebhookConfig> {
    return this.reposGetWebhookConfigForRepo$Response(params, context).pipe(
      map((r: StrictHttpResponse<WebhookConfig>): WebhookConfig => r.body)
    );
  }

  /** Path part for operation `reposUpdateWebhookConfigForRepo()` */
  static readonly ReposUpdateWebhookConfigForRepoPath = '/repos/{owner}/{repo}/hooks/{hook_id}/config';

  /**
   * Update a webhook configuration for a repository.
   *
   * Updates the webhook configuration for a repository. To update more information about the webhook, including the `active` state and `events`, use "[Update a repository webhook](/rest/webhooks/repos#update-a-repository-webhook)."
   *
   * Access tokens must have the `write:repo_hook` or `repo` scope, and GitHub Apps must have the `repository_hooks:write` permission.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposUpdateWebhookConfigForRepo()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposUpdateWebhookConfigForRepo$Response(params: ReposUpdateWebhookConfigForRepo$Params, context?: HttpContext): Observable<StrictHttpResponse<WebhookConfig>> {
    return reposUpdateWebhookConfigForRepo(this.http, this.rootUrl, params, context);
  }

  /**
   * Update a webhook configuration for a repository.
   *
   * Updates the webhook configuration for a repository. To update more information about the webhook, including the `active` state and `events`, use "[Update a repository webhook](/rest/webhooks/repos#update-a-repository-webhook)."
   *
   * Access tokens must have the `write:repo_hook` or `repo` scope, and GitHub Apps must have the `repository_hooks:write` permission.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposUpdateWebhookConfigForRepo$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposUpdateWebhookConfigForRepo(params: ReposUpdateWebhookConfigForRepo$Params, context?: HttpContext): Observable<WebhookConfig> {
    return this.reposUpdateWebhookConfigForRepo$Response(params, context).pipe(
      map((r: StrictHttpResponse<WebhookConfig>): WebhookConfig => r.body)
    );
  }

  /** Path part for operation `reposListWebhookDeliveries()` */
  static readonly ReposListWebhookDeliveriesPath = '/repos/{owner}/{repo}/hooks/{hook_id}/deliveries';

  /**
   * List deliveries for a repository webhook.
   *
   * Returns a list of webhook deliveries for a webhook configured in a repository.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposListWebhookDeliveries()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposListWebhookDeliveries$Response(params: ReposListWebhookDeliveries$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<HookDeliveryItem>>> {
    return reposListWebhookDeliveries(this.http, this.rootUrl, params, context);
  }

  /**
   * List deliveries for a repository webhook.
   *
   * Returns a list of webhook deliveries for a webhook configured in a repository.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposListWebhookDeliveries$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposListWebhookDeliveries(params: ReposListWebhookDeliveries$Params, context?: HttpContext): Observable<Array<HookDeliveryItem>> {
    return this.reposListWebhookDeliveries$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<HookDeliveryItem>>): Array<HookDeliveryItem> => r.body)
    );
  }

  /** Path part for operation `reposGetWebhookDelivery()` */
  static readonly ReposGetWebhookDeliveryPath = '/repos/{owner}/{repo}/hooks/{hook_id}/deliveries/{delivery_id}';

  /**
   * Get a delivery for a repository webhook.
   *
   * Returns a delivery for a webhook configured in a repository.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposGetWebhookDelivery()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetWebhookDelivery$Response(params: ReposGetWebhookDelivery$Params, context?: HttpContext): Observable<StrictHttpResponse<HookDelivery>> {
    return reposGetWebhookDelivery(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a delivery for a repository webhook.
   *
   * Returns a delivery for a webhook configured in a repository.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposGetWebhookDelivery$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetWebhookDelivery(params: ReposGetWebhookDelivery$Params, context?: HttpContext): Observable<HookDelivery> {
    return this.reposGetWebhookDelivery$Response(params, context).pipe(
      map((r: StrictHttpResponse<HookDelivery>): HookDelivery => r.body)
    );
  }

  /** Path part for operation `reposRedeliverWebhookDelivery()` */
  static readonly ReposRedeliverWebhookDeliveryPath = '/repos/{owner}/{repo}/hooks/{hook_id}/deliveries/{delivery_id}/attempts';

  /**
   * Redeliver a delivery for a repository webhook.
   *
   * Redeliver a webhook delivery for a webhook configured in a repository.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposRedeliverWebhookDelivery()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposRedeliverWebhookDelivery$Response(params: ReposRedeliverWebhookDelivery$Params, context?: HttpContext): Observable<StrictHttpResponse<{
}>> {
    return reposRedeliverWebhookDelivery(this.http, this.rootUrl, params, context);
  }

  /**
   * Redeliver a delivery for a repository webhook.
   *
   * Redeliver a webhook delivery for a webhook configured in a repository.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposRedeliverWebhookDelivery$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposRedeliverWebhookDelivery(params: ReposRedeliverWebhookDelivery$Params, context?: HttpContext): Observable<{
}> {
    return this.reposRedeliverWebhookDelivery$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
}>): {
} => r.body)
    );
  }

  /** Path part for operation `reposPingWebhook()` */
  static readonly ReposPingWebhookPath = '/repos/{owner}/{repo}/hooks/{hook_id}/pings';

  /**
   * Ping a repository webhook.
   *
   * This will trigger a [ping event](https://docs.github.com/webhooks/#ping-event) to be sent to the hook.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposPingWebhook()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposPingWebhook$Response(params: ReposPingWebhook$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return reposPingWebhook(this.http, this.rootUrl, params, context);
  }

  /**
   * Ping a repository webhook.
   *
   * This will trigger a [ping event](https://docs.github.com/webhooks/#ping-event) to be sent to the hook.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposPingWebhook$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposPingWebhook(params: ReposPingWebhook$Params, context?: HttpContext): Observable<void> {
    return this.reposPingWebhook$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `reposTestPushWebhook()` */
  static readonly ReposTestPushWebhookPath = '/repos/{owner}/{repo}/hooks/{hook_id}/tests';

  /**
   * Test the push repository webhook.
   *
   * This will trigger the hook with the latest push to the current repository if the hook is subscribed to `push` events. If the hook is not subscribed to `push` events, the server will respond with 204 but no test POST will be generated.
   *
   * **Note**: Previously `/repos/:owner/:repo/hooks/:hook_id/test`
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposTestPushWebhook()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposTestPushWebhook$Response(params: ReposTestPushWebhook$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return reposTestPushWebhook(this.http, this.rootUrl, params, context);
  }

  /**
   * Test the push repository webhook.
   *
   * This will trigger the hook with the latest push to the current repository if the hook is subscribed to `push` events. If the hook is not subscribed to `push` events, the server will respond with 204 but no test POST will be generated.
   *
   * **Note**: Previously `/repos/:owner/:repo/hooks/:hook_id/test`
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposTestPushWebhook$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposTestPushWebhook(params: ReposTestPushWebhook$Params, context?: HttpContext): Observable<void> {
    return this.reposTestPushWebhook$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `reposListInvitations()` */
  static readonly ReposListInvitationsPath = '/repos/{owner}/{repo}/invitations';

  /**
   * List repository invitations.
   *
   * When authenticating as a user with admin rights to a repository, this endpoint will list all currently open repository invitations.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposListInvitations()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposListInvitations$Response(params: ReposListInvitations$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<RepositoryInvitation>>> {
    return reposListInvitations(this.http, this.rootUrl, params, context);
  }

  /**
   * List repository invitations.
   *
   * When authenticating as a user with admin rights to a repository, this endpoint will list all currently open repository invitations.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposListInvitations$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposListInvitations(params: ReposListInvitations$Params, context?: HttpContext): Observable<Array<RepositoryInvitation>> {
    return this.reposListInvitations$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<RepositoryInvitation>>): Array<RepositoryInvitation> => r.body)
    );
  }

  /** Path part for operation `reposDeleteInvitation()` */
  static readonly ReposDeleteInvitationPath = '/repos/{owner}/{repo}/invitations/{invitation_id}';

  /**
   * Delete a repository invitation.
   *
   *
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposDeleteInvitation()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposDeleteInvitation$Response(params: ReposDeleteInvitation$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return reposDeleteInvitation(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete a repository invitation.
   *
   *
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposDeleteInvitation$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposDeleteInvitation(params: ReposDeleteInvitation$Params, context?: HttpContext): Observable<void> {
    return this.reposDeleteInvitation$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `reposUpdateInvitation()` */
  static readonly ReposUpdateInvitationPath = '/repos/{owner}/{repo}/invitations/{invitation_id}';

  /**
   * Update a repository invitation.
   *
   *
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposUpdateInvitation()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposUpdateInvitation$Response(params: ReposUpdateInvitation$Params, context?: HttpContext): Observable<StrictHttpResponse<RepositoryInvitation>> {
    return reposUpdateInvitation(this.http, this.rootUrl, params, context);
  }

  /**
   * Update a repository invitation.
   *
   *
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposUpdateInvitation$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposUpdateInvitation(params: ReposUpdateInvitation$Params, context?: HttpContext): Observable<RepositoryInvitation> {
    return this.reposUpdateInvitation$Response(params, context).pipe(
      map((r: StrictHttpResponse<RepositoryInvitation>): RepositoryInvitation => r.body)
    );
  }

  /** Path part for operation `reposListDeployKeys()` */
  static readonly ReposListDeployKeysPath = '/repos/{owner}/{repo}/keys';

  /**
   * List deploy keys.
   *
   *
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposListDeployKeys()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposListDeployKeys$Response(params: ReposListDeployKeys$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<DeployKey>>> {
    return reposListDeployKeys(this.http, this.rootUrl, params, context);
  }

  /**
   * List deploy keys.
   *
   *
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposListDeployKeys$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposListDeployKeys(params: ReposListDeployKeys$Params, context?: HttpContext): Observable<Array<DeployKey>> {
    return this.reposListDeployKeys$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<DeployKey>>): Array<DeployKey> => r.body)
    );
  }

  /** Path part for operation `reposCreateDeployKey()` */
  static readonly ReposCreateDeployKeyPath = '/repos/{owner}/{repo}/keys';

  /**
   * Create a deploy key.
   *
   * You can create a read-only deploy key.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposCreateDeployKey()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposCreateDeployKey$Response(params: ReposCreateDeployKey$Params, context?: HttpContext): Observable<StrictHttpResponse<DeployKey>> {
    return reposCreateDeployKey(this.http, this.rootUrl, params, context);
  }

  /**
   * Create a deploy key.
   *
   * You can create a read-only deploy key.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposCreateDeployKey$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposCreateDeployKey(params: ReposCreateDeployKey$Params, context?: HttpContext): Observable<DeployKey> {
    return this.reposCreateDeployKey$Response(params, context).pipe(
      map((r: StrictHttpResponse<DeployKey>): DeployKey => r.body)
    );
  }

  /** Path part for operation `reposGetDeployKey()` */
  static readonly ReposGetDeployKeyPath = '/repos/{owner}/{repo}/keys/{key_id}';

  /**
   * Get a deploy key.
   *
   *
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposGetDeployKey()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetDeployKey$Response(params: ReposGetDeployKey$Params, context?: HttpContext): Observable<StrictHttpResponse<DeployKey>> {
    return reposGetDeployKey(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a deploy key.
   *
   *
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposGetDeployKey$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetDeployKey(params: ReposGetDeployKey$Params, context?: HttpContext): Observable<DeployKey> {
    return this.reposGetDeployKey$Response(params, context).pipe(
      map((r: StrictHttpResponse<DeployKey>): DeployKey => r.body)
    );
  }

  /** Path part for operation `reposDeleteDeployKey()` */
  static readonly ReposDeleteDeployKeyPath = '/repos/{owner}/{repo}/keys/{key_id}';

  /**
   * Delete a deploy key.
   *
   * Deploy keys are immutable. If you need to update a key, remove the key and create a new one instead.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposDeleteDeployKey()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposDeleteDeployKey$Response(params: ReposDeleteDeployKey$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return reposDeleteDeployKey(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete a deploy key.
   *
   * Deploy keys are immutable. If you need to update a key, remove the key and create a new one instead.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposDeleteDeployKey$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposDeleteDeployKey(params: ReposDeleteDeployKey$Params, context?: HttpContext): Observable<void> {
    return this.reposDeleteDeployKey$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `reposListLanguages()` */
  static readonly ReposListLanguagesPath = '/repos/{owner}/{repo}/languages';

  /**
   * List repository languages.
   *
   * Lists languages for the specified repository. The value shown for each language is the number of bytes of code written in that language.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposListLanguages()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposListLanguages$Response(params: ReposListLanguages$Params, context?: HttpContext): Observable<StrictHttpResponse<Language>> {
    return reposListLanguages(this.http, this.rootUrl, params, context);
  }

  /**
   * List repository languages.
   *
   * Lists languages for the specified repository. The value shown for each language is the number of bytes of code written in that language.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposListLanguages$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposListLanguages(params: ReposListLanguages$Params, context?: HttpContext): Observable<Language> {
    return this.reposListLanguages$Response(params, context).pipe(
      map((r: StrictHttpResponse<Language>): Language => r.body)
    );
  }

  /** Path part for operation `reposMergeUpstream()` */
  static readonly ReposMergeUpstreamPath = '/repos/{owner}/{repo}/merge-upstream';

  /**
   * Sync a fork branch with the upstream repository.
   *
   * Sync a branch of a forked repository to keep it up-to-date with the upstream repository.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposMergeUpstream()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposMergeUpstream$Response(params: ReposMergeUpstream$Params, context?: HttpContext): Observable<StrictHttpResponse<MergedUpstream>> {
    return reposMergeUpstream(this.http, this.rootUrl, params, context);
  }

  /**
   * Sync a fork branch with the upstream repository.
   *
   * Sync a branch of a forked repository to keep it up-to-date with the upstream repository.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposMergeUpstream$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposMergeUpstream(params: ReposMergeUpstream$Params, context?: HttpContext): Observable<MergedUpstream> {
    return this.reposMergeUpstream$Response(params, context).pipe(
      map((r: StrictHttpResponse<MergedUpstream>): MergedUpstream => r.body)
    );
  }

  /** Path part for operation `reposMerge()` */
  static readonly ReposMergePath = '/repos/{owner}/{repo}/merges';

  /**
   * Merge a branch.
   *
   *
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposMerge()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposMerge$Response(params: ReposMerge$Params, context?: HttpContext): Observable<StrictHttpResponse<Commit>> {
    return reposMerge(this.http, this.rootUrl, params, context);
  }

  /**
   * Merge a branch.
   *
   *
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposMerge$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposMerge(params: ReposMerge$Params, context?: HttpContext): Observable<Commit> {
    return this.reposMerge$Response(params, context).pipe(
      map((r: StrictHttpResponse<Commit>): Commit => r.body)
    );
  }

  /** Path part for operation `reposGetPages()` */
  static readonly ReposGetPagesPath = '/repos/{owner}/{repo}/pages';

  /**
   * Get a GitHub Pages site.
   *
   * Gets information about a GitHub Pages site.
   *
   * A token with the `repo` scope is required. GitHub Apps must have the `pages:read` permission.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposGetPages()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetPages$Response(params: ReposGetPages$Params, context?: HttpContext): Observable<StrictHttpResponse<Page>> {
    return reposGetPages(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a GitHub Pages site.
   *
   * Gets information about a GitHub Pages site.
   *
   * A token with the `repo` scope is required. GitHub Apps must have the `pages:read` permission.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposGetPages$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetPages(params: ReposGetPages$Params, context?: HttpContext): Observable<Page> {
    return this.reposGetPages$Response(params, context).pipe(
      map((r: StrictHttpResponse<Page>): Page => r.body)
    );
  }

  /** Path part for operation `reposUpdateInformationAboutPagesSite()` */
  static readonly ReposUpdateInformationAboutPagesSitePath = '/repos/{owner}/{repo}/pages';

  /**
   * Update information about a GitHub Pages site.
   *
   * Updates information for a GitHub Pages site. For more information, see "[About GitHub Pages](/github/working-with-github-pages/about-github-pages).
   *
   * To use this endpoint, you must be a repository administrator, maintainer, or have the 'manage GitHub Pages settings' permission. A token with the `repo` scope or Pages write permission is required. GitHub Apps must have the `administration:write` and `pages:write` permissions.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposUpdateInformationAboutPagesSite()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposUpdateInformationAboutPagesSite$Response(params: ReposUpdateInformationAboutPagesSite$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return reposUpdateInformationAboutPagesSite(this.http, this.rootUrl, params, context);
  }

  /**
   * Update information about a GitHub Pages site.
   *
   * Updates information for a GitHub Pages site. For more information, see "[About GitHub Pages](/github/working-with-github-pages/about-github-pages).
   *
   * To use this endpoint, you must be a repository administrator, maintainer, or have the 'manage GitHub Pages settings' permission. A token with the `repo` scope or Pages write permission is required. GitHub Apps must have the `administration:write` and `pages:write` permissions.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposUpdateInformationAboutPagesSite$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposUpdateInformationAboutPagesSite(params: ReposUpdateInformationAboutPagesSite$Params, context?: HttpContext): Observable<void> {
    return this.reposUpdateInformationAboutPagesSite$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `reposCreatePagesSite()` */
  static readonly ReposCreatePagesSitePath = '/repos/{owner}/{repo}/pages';

  /**
   * Create a GitHub Pages site.
   *
   * Configures a GitHub Pages site. For more information, see "[About GitHub Pages](/github/working-with-github-pages/about-github-pages)."
   *
   * To use this endpoint, you must be a repository administrator, maintainer, or have the 'manage GitHub Pages settings' permission. A token with the `repo` scope or Pages write permission is required. GitHub Apps must have the `administration:write` and `pages:write` permissions.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposCreatePagesSite()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposCreatePagesSite$Response(params: ReposCreatePagesSite$Params, context?: HttpContext): Observable<StrictHttpResponse<Page>> {
    return reposCreatePagesSite(this.http, this.rootUrl, params, context);
  }

  /**
   * Create a GitHub Pages site.
   *
   * Configures a GitHub Pages site. For more information, see "[About GitHub Pages](/github/working-with-github-pages/about-github-pages)."
   *
   * To use this endpoint, you must be a repository administrator, maintainer, or have the 'manage GitHub Pages settings' permission. A token with the `repo` scope or Pages write permission is required. GitHub Apps must have the `administration:write` and `pages:write` permissions.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposCreatePagesSite$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposCreatePagesSite(params: ReposCreatePagesSite$Params, context?: HttpContext): Observable<Page> {
    return this.reposCreatePagesSite$Response(params, context).pipe(
      map((r: StrictHttpResponse<Page>): Page => r.body)
    );
  }

  /** Path part for operation `reposDeletePagesSite()` */
  static readonly ReposDeletePagesSitePath = '/repos/{owner}/{repo}/pages';

  /**
   * Delete a GitHub Pages site.
   *
   * Deletes a GitHub Pages site. For more information, see "[About GitHub Pages](/github/working-with-github-pages/about-github-pages).
   *
   * To use this endpoint, you must be a repository administrator, maintainer, or have the 'manage GitHub Pages settings' permission. A token with the `repo` scope or Pages write permission is required. GitHub Apps must have the `administration:write` and `pages:write` permissions.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposDeletePagesSite()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposDeletePagesSite$Response(params: ReposDeletePagesSite$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return reposDeletePagesSite(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete a GitHub Pages site.
   *
   * Deletes a GitHub Pages site. For more information, see "[About GitHub Pages](/github/working-with-github-pages/about-github-pages).
   *
   * To use this endpoint, you must be a repository administrator, maintainer, or have the 'manage GitHub Pages settings' permission. A token with the `repo` scope or Pages write permission is required. GitHub Apps must have the `administration:write` and `pages:write` permissions.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposDeletePagesSite$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposDeletePagesSite(params: ReposDeletePagesSite$Params, context?: HttpContext): Observable<void> {
    return this.reposDeletePagesSite$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `reposListPagesBuilds()` */
  static readonly ReposListPagesBuildsPath = '/repos/{owner}/{repo}/pages/builds';

  /**
   * List GitHub Pages builds.
   *
   * Lists builts of a GitHub Pages site.
   *
   * A token with the `repo` scope is required. GitHub Apps must have the `pages:read` permission.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposListPagesBuilds()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposListPagesBuilds$Response(params: ReposListPagesBuilds$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<PageBuild>>> {
    return reposListPagesBuilds(this.http, this.rootUrl, params, context);
  }

  /**
   * List GitHub Pages builds.
   *
   * Lists builts of a GitHub Pages site.
   *
   * A token with the `repo` scope is required. GitHub Apps must have the `pages:read` permission.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposListPagesBuilds$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposListPagesBuilds(params: ReposListPagesBuilds$Params, context?: HttpContext): Observable<Array<PageBuild>> {
    return this.reposListPagesBuilds$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<PageBuild>>): Array<PageBuild> => r.body)
    );
  }

  /** Path part for operation `reposRequestPagesBuild()` */
  static readonly ReposRequestPagesBuildPath = '/repos/{owner}/{repo}/pages/builds';

  /**
   * Request a GitHub Pages build.
   *
   * You can request that your site be built from the latest revision on the default branch. This has the same effect as pushing a commit to your default branch, but does not require an additional commit. Manually triggering page builds can be helpful when diagnosing build warnings and failures.
   *
   * Build requests are limited to one concurrent build per repository and one concurrent build per requester. If you request a build while another is still in progress, the second request will be queued until the first completes.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposRequestPagesBuild()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposRequestPagesBuild$Response(params: ReposRequestPagesBuild$Params, context?: HttpContext): Observable<StrictHttpResponse<PageBuildStatus>> {
    return reposRequestPagesBuild(this.http, this.rootUrl, params, context);
  }

  /**
   * Request a GitHub Pages build.
   *
   * You can request that your site be built from the latest revision on the default branch. This has the same effect as pushing a commit to your default branch, but does not require an additional commit. Manually triggering page builds can be helpful when diagnosing build warnings and failures.
   *
   * Build requests are limited to one concurrent build per repository and one concurrent build per requester. If you request a build while another is still in progress, the second request will be queued until the first completes.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposRequestPagesBuild$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposRequestPagesBuild(params: ReposRequestPagesBuild$Params, context?: HttpContext): Observable<PageBuildStatus> {
    return this.reposRequestPagesBuild$Response(params, context).pipe(
      map((r: StrictHttpResponse<PageBuildStatus>): PageBuildStatus => r.body)
    );
  }

  /** Path part for operation `reposGetLatestPagesBuild()` */
  static readonly ReposGetLatestPagesBuildPath = '/repos/{owner}/{repo}/pages/builds/latest';

  /**
   * Get latest Pages build.
   *
   * Gets information about the single most recent build of a GitHub Pages site.
   *
   * A token with the `repo` scope is required. GitHub Apps must have the `pages:read` permission.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposGetLatestPagesBuild()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetLatestPagesBuild$Response(params: ReposGetLatestPagesBuild$Params, context?: HttpContext): Observable<StrictHttpResponse<PageBuild>> {
    return reposGetLatestPagesBuild(this.http, this.rootUrl, params, context);
  }

  /**
   * Get latest Pages build.
   *
   * Gets information about the single most recent build of a GitHub Pages site.
   *
   * A token with the `repo` scope is required. GitHub Apps must have the `pages:read` permission.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposGetLatestPagesBuild$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetLatestPagesBuild(params: ReposGetLatestPagesBuild$Params, context?: HttpContext): Observable<PageBuild> {
    return this.reposGetLatestPagesBuild$Response(params, context).pipe(
      map((r: StrictHttpResponse<PageBuild>): PageBuild => r.body)
    );
  }

  /** Path part for operation `reposGetPagesBuild()` */
  static readonly ReposGetPagesBuildPath = '/repos/{owner}/{repo}/pages/builds/{build_id}';

  /**
   * Get GitHub Pages build.
   *
   * Gets information about a GitHub Pages build.
   *
   * A token with the `repo` scope is required. GitHub Apps must have the `pages:read` permission.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposGetPagesBuild()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetPagesBuild$Response(params: ReposGetPagesBuild$Params, context?: HttpContext): Observable<StrictHttpResponse<PageBuild>> {
    return reposGetPagesBuild(this.http, this.rootUrl, params, context);
  }

  /**
   * Get GitHub Pages build.
   *
   * Gets information about a GitHub Pages build.
   *
   * A token with the `repo` scope is required. GitHub Apps must have the `pages:read` permission.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposGetPagesBuild$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetPagesBuild(params: ReposGetPagesBuild$Params, context?: HttpContext): Observable<PageBuild> {
    return this.reposGetPagesBuild$Response(params, context).pipe(
      map((r: StrictHttpResponse<PageBuild>): PageBuild => r.body)
    );
  }

  /** Path part for operation `reposCreatePagesDeployment()` */
  static readonly ReposCreatePagesDeploymentPath = '/repos/{owner}/{repo}/pages/deployment';

  /**
   * Create a GitHub Pages deployment.
   *
   * Create a GitHub Pages deployment for a repository.
   *
   * Users must have write permissions. GitHub Apps must have the `pages:write` permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposCreatePagesDeployment()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposCreatePagesDeployment$Response(params: ReposCreatePagesDeployment$Params, context?: HttpContext): Observable<StrictHttpResponse<PageDeployment>> {
    return reposCreatePagesDeployment(this.http, this.rootUrl, params, context);
  }

  /**
   * Create a GitHub Pages deployment.
   *
   * Create a GitHub Pages deployment for a repository.
   *
   * Users must have write permissions. GitHub Apps must have the `pages:write` permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposCreatePagesDeployment$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposCreatePagesDeployment(params: ReposCreatePagesDeployment$Params, context?: HttpContext): Observable<PageDeployment> {
    return this.reposCreatePagesDeployment$Response(params, context).pipe(
      map((r: StrictHttpResponse<PageDeployment>): PageDeployment => r.body)
    );
  }

  /** Path part for operation `reposGetPagesHealthCheck()` */
  static readonly ReposGetPagesHealthCheckPath = '/repos/{owner}/{repo}/pages/health';

  /**
   * Get a DNS health check for GitHub Pages.
   *
   * Gets a health check of the DNS settings for the `CNAME` record configured for a repository's GitHub Pages.
   *
   * The first request to this endpoint returns a `202 Accepted` status and starts an asynchronous background task to get the results for the domain. After the background task completes, subsequent requests to this endpoint return a `200 OK` status with the health check results in the response.
   *
   * To use this endpoint, you must be a repository administrator, maintainer, or have the 'manage GitHub Pages settings' permission. A token with the `repo` scope or Pages write permission is required. GitHub Apps must have the `administrative:write` and `pages:write` permissions.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposGetPagesHealthCheck()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetPagesHealthCheck$Response(params: ReposGetPagesHealthCheck$Params, context?: HttpContext): Observable<StrictHttpResponse<PagesHealthCheck>> {
    return reposGetPagesHealthCheck(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a DNS health check for GitHub Pages.
   *
   * Gets a health check of the DNS settings for the `CNAME` record configured for a repository's GitHub Pages.
   *
   * The first request to this endpoint returns a `202 Accepted` status and starts an asynchronous background task to get the results for the domain. After the background task completes, subsequent requests to this endpoint return a `200 OK` status with the health check results in the response.
   *
   * To use this endpoint, you must be a repository administrator, maintainer, or have the 'manage GitHub Pages settings' permission. A token with the `repo` scope or Pages write permission is required. GitHub Apps must have the `administrative:write` and `pages:write` permissions.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposGetPagesHealthCheck$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetPagesHealthCheck(params: ReposGetPagesHealthCheck$Params, context?: HttpContext): Observable<PagesHealthCheck> {
    return this.reposGetPagesHealthCheck$Response(params, context).pipe(
      map((r: StrictHttpResponse<PagesHealthCheck>): PagesHealthCheck => r.body)
    );
  }

  /** Path part for operation `reposEnablePrivateVulnerabilityReporting()` */
  static readonly ReposEnablePrivateVulnerabilityReportingPath = '/repos/{owner}/{repo}/private-vulnerability-reporting';

  /**
   * Enable private vulnerability reporting for a repository.
   *
   * Enables private vulnerability reporting for a repository. The authenticated user must have admin access to the repository. For more information, see "[Privately reporting a security vulnerability](https://docs.github.com/code-security/security-advisories/guidance-on-reporting-and-writing/privately-reporting-a-security-vulnerability)."
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposEnablePrivateVulnerabilityReporting()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposEnablePrivateVulnerabilityReporting$Response(params: ReposEnablePrivateVulnerabilityReporting$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return reposEnablePrivateVulnerabilityReporting(this.http, this.rootUrl, params, context);
  }

  /**
   * Enable private vulnerability reporting for a repository.
   *
   * Enables private vulnerability reporting for a repository. The authenticated user must have admin access to the repository. For more information, see "[Privately reporting a security vulnerability](https://docs.github.com/code-security/security-advisories/guidance-on-reporting-and-writing/privately-reporting-a-security-vulnerability)."
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposEnablePrivateVulnerabilityReporting$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposEnablePrivateVulnerabilityReporting(params: ReposEnablePrivateVulnerabilityReporting$Params, context?: HttpContext): Observable<void> {
    return this.reposEnablePrivateVulnerabilityReporting$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `reposDisablePrivateVulnerabilityReporting()` */
  static readonly ReposDisablePrivateVulnerabilityReportingPath = '/repos/{owner}/{repo}/private-vulnerability-reporting';

  /**
   * Disable private vulnerability reporting for a repository.
   *
   * Disables private vulnerability reporting for a repository. The authenticated user must have admin access to the repository. For more information, see "[Privately reporting a security vulnerability](https://docs.github.com/code-security/security-advisories/guidance-on-reporting-and-writing/privately-reporting-a-security-vulnerability)".
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposDisablePrivateVulnerabilityReporting()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposDisablePrivateVulnerabilityReporting$Response(params: ReposDisablePrivateVulnerabilityReporting$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return reposDisablePrivateVulnerabilityReporting(this.http, this.rootUrl, params, context);
  }

  /**
   * Disable private vulnerability reporting for a repository.
   *
   * Disables private vulnerability reporting for a repository. The authenticated user must have admin access to the repository. For more information, see "[Privately reporting a security vulnerability](https://docs.github.com/code-security/security-advisories/guidance-on-reporting-and-writing/privately-reporting-a-security-vulnerability)".
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposDisablePrivateVulnerabilityReporting$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposDisablePrivateVulnerabilityReporting(params: ReposDisablePrivateVulnerabilityReporting$Params, context?: HttpContext): Observable<void> {
    return this.reposDisablePrivateVulnerabilityReporting$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `reposGetReadme()` */
  static readonly ReposGetReadmePath = '/repos/{owner}/{repo}/readme';

  /**
   * Get a repository README.
   *
   * Gets the preferred README for a repository.
   *
   * READMEs support [custom media types](https://docs.github.com/rest/overview/media-types) for retrieving the raw content or rendered HTML.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposGetReadme()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetReadme$Response(params: ReposGetReadme$Params, context?: HttpContext): Observable<StrictHttpResponse<ContentFile>> {
    return reposGetReadme(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a repository README.
   *
   * Gets the preferred README for a repository.
   *
   * READMEs support [custom media types](https://docs.github.com/rest/overview/media-types) for retrieving the raw content or rendered HTML.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposGetReadme$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetReadme(params: ReposGetReadme$Params, context?: HttpContext): Observable<ContentFile> {
    return this.reposGetReadme$Response(params, context).pipe(
      map((r: StrictHttpResponse<ContentFile>): ContentFile => r.body)
    );
  }

  /** Path part for operation `reposGetReadmeInDirectory()` */
  static readonly ReposGetReadmeInDirectoryPath = '/repos/{owner}/{repo}/readme/{dir}';

  /**
   * Get a repository README for a directory.
   *
   * Gets the README from a repository directory.
   *
   * READMEs support [custom media types](https://docs.github.com/rest/overview/media-types) for retrieving the raw content or rendered HTML.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposGetReadmeInDirectory()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetReadmeInDirectory$Response(params: ReposGetReadmeInDirectory$Params, context?: HttpContext): Observable<StrictHttpResponse<ContentFile>> {
    return reposGetReadmeInDirectory(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a repository README for a directory.
   *
   * Gets the README from a repository directory.
   *
   * READMEs support [custom media types](https://docs.github.com/rest/overview/media-types) for retrieving the raw content or rendered HTML.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposGetReadmeInDirectory$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetReadmeInDirectory(params: ReposGetReadmeInDirectory$Params, context?: HttpContext): Observable<ContentFile> {
    return this.reposGetReadmeInDirectory$Response(params, context).pipe(
      map((r: StrictHttpResponse<ContentFile>): ContentFile => r.body)
    );
  }

  /** Path part for operation `reposListReleases()` */
  static readonly ReposListReleasesPath = '/repos/{owner}/{repo}/releases';

  /**
   * List releases.
   *
   * This returns a list of releases, which does not include regular Git tags that have not been associated with a release. To get a list of Git tags, use the [Repository Tags API](https://docs.github.com/rest/repos/repos#list-repository-tags).
   *
   * Information about published releases are available to everyone. Only users with push access will receive listings for draft releases.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposListReleases()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposListReleases$Response(params: ReposListReleases$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Release>>> {
    return reposListReleases(this.http, this.rootUrl, params, context);
  }

  /**
   * List releases.
   *
   * This returns a list of releases, which does not include regular Git tags that have not been associated with a release. To get a list of Git tags, use the [Repository Tags API](https://docs.github.com/rest/repos/repos#list-repository-tags).
   *
   * Information about published releases are available to everyone. Only users with push access will receive listings for draft releases.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposListReleases$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposListReleases(params: ReposListReleases$Params, context?: HttpContext): Observable<Array<Release>> {
    return this.reposListReleases$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Release>>): Array<Release> => r.body)
    );
  }

  /** Path part for operation `reposCreateRelease()` */
  static readonly ReposCreateReleasePath = '/repos/{owner}/{repo}/releases';

  /**
   * Create a release.
   *
   * Users with push access to the repository can create a release.
   *
   * This endpoint triggers [notifications](https://docs.github.com/github/managing-subscriptions-and-notifications-on-github/about-notifications). Creating content too quickly using this endpoint may result in secondary rate limiting. See "[Secondary rate limits](https://docs.github.com/rest/overview/resources-in-the-rest-api#secondary-rate-limits)" and "[Dealing with secondary rate limits](https://docs.github.com/rest/guides/best-practices-for-integrators#dealing-with-secondary-rate-limits)" for details.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposCreateRelease()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposCreateRelease$Response(params: ReposCreateRelease$Params, context?: HttpContext): Observable<StrictHttpResponse<Release>> {
    return reposCreateRelease(this.http, this.rootUrl, params, context);
  }

  /**
   * Create a release.
   *
   * Users with push access to the repository can create a release.
   *
   * This endpoint triggers [notifications](https://docs.github.com/github/managing-subscriptions-and-notifications-on-github/about-notifications). Creating content too quickly using this endpoint may result in secondary rate limiting. See "[Secondary rate limits](https://docs.github.com/rest/overview/resources-in-the-rest-api#secondary-rate-limits)" and "[Dealing with secondary rate limits](https://docs.github.com/rest/guides/best-practices-for-integrators#dealing-with-secondary-rate-limits)" for details.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposCreateRelease$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposCreateRelease(params: ReposCreateRelease$Params, context?: HttpContext): Observable<Release> {
    return this.reposCreateRelease$Response(params, context).pipe(
      map((r: StrictHttpResponse<Release>): Release => r.body)
    );
  }

  /** Path part for operation `reposGetReleaseAsset()` */
  static readonly ReposGetReleaseAssetPath = '/repos/{owner}/{repo}/releases/assets/{asset_id}';

  /**
   * Get a release asset.
   *
   * To download the asset's binary content, set the `Accept` header of the request to [`application/octet-stream`](https://docs.github.com/rest/overview/media-types). The API will either redirect the client to the location, or stream it directly if possible. API clients should handle both a `200` or `302` response.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposGetReleaseAsset()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetReleaseAsset$Response(params: ReposGetReleaseAsset$Params, context?: HttpContext): Observable<StrictHttpResponse<ReleaseAsset>> {
    return reposGetReleaseAsset(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a release asset.
   *
   * To download the asset's binary content, set the `Accept` header of the request to [`application/octet-stream`](https://docs.github.com/rest/overview/media-types). The API will either redirect the client to the location, or stream it directly if possible. API clients should handle both a `200` or `302` response.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposGetReleaseAsset$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetReleaseAsset(params: ReposGetReleaseAsset$Params, context?: HttpContext): Observable<ReleaseAsset> {
    return this.reposGetReleaseAsset$Response(params, context).pipe(
      map((r: StrictHttpResponse<ReleaseAsset>): ReleaseAsset => r.body)
    );
  }

  /** Path part for operation `reposDeleteReleaseAsset()` */
  static readonly ReposDeleteReleaseAssetPath = '/repos/{owner}/{repo}/releases/assets/{asset_id}';

  /**
   * Delete a release asset.
   *
   *
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposDeleteReleaseAsset()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposDeleteReleaseAsset$Response(params: ReposDeleteReleaseAsset$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return reposDeleteReleaseAsset(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete a release asset.
   *
   *
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposDeleteReleaseAsset$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposDeleteReleaseAsset(params: ReposDeleteReleaseAsset$Params, context?: HttpContext): Observable<void> {
    return this.reposDeleteReleaseAsset$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `reposUpdateReleaseAsset()` */
  static readonly ReposUpdateReleaseAssetPath = '/repos/{owner}/{repo}/releases/assets/{asset_id}';

  /**
   * Update a release asset.
   *
   * Users with push access to the repository can edit a release asset.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposUpdateReleaseAsset()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposUpdateReleaseAsset$Response(params: ReposUpdateReleaseAsset$Params, context?: HttpContext): Observable<StrictHttpResponse<ReleaseAsset>> {
    return reposUpdateReleaseAsset(this.http, this.rootUrl, params, context);
  }

  /**
   * Update a release asset.
   *
   * Users with push access to the repository can edit a release asset.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposUpdateReleaseAsset$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposUpdateReleaseAsset(params: ReposUpdateReleaseAsset$Params, context?: HttpContext): Observable<ReleaseAsset> {
    return this.reposUpdateReleaseAsset$Response(params, context).pipe(
      map((r: StrictHttpResponse<ReleaseAsset>): ReleaseAsset => r.body)
    );
  }

  /** Path part for operation `reposGenerateReleaseNotes()` */
  static readonly ReposGenerateReleaseNotesPath = '/repos/{owner}/{repo}/releases/generate-notes';

  /**
   * Generate release notes content for a release.
   *
   * Generate a name and body describing a [release](https://docs.github.com/rest/releases/releases#get-a-release). The body content will be markdown formatted and contain information like the changes since last release and users who contributed. The generated release notes are not saved anywhere. They are intended to be generated and used when creating a new release.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposGenerateReleaseNotes()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposGenerateReleaseNotes$Response(params: ReposGenerateReleaseNotes$Params, context?: HttpContext): Observable<StrictHttpResponse<ReleaseNotesContent>> {
    return reposGenerateReleaseNotes(this.http, this.rootUrl, params, context);
  }

  /**
   * Generate release notes content for a release.
   *
   * Generate a name and body describing a [release](https://docs.github.com/rest/releases/releases#get-a-release). The body content will be markdown formatted and contain information like the changes since last release and users who contributed. The generated release notes are not saved anywhere. They are intended to be generated and used when creating a new release.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposGenerateReleaseNotes$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposGenerateReleaseNotes(params: ReposGenerateReleaseNotes$Params, context?: HttpContext): Observable<ReleaseNotesContent> {
    return this.reposGenerateReleaseNotes$Response(params, context).pipe(
      map((r: StrictHttpResponse<ReleaseNotesContent>): ReleaseNotesContent => r.body)
    );
  }

  /** Path part for operation `reposGetLatestRelease()` */
  static readonly ReposGetLatestReleasePath = '/repos/{owner}/{repo}/releases/latest';

  /**
   * Get the latest release.
   *
   * View the latest published full release for the repository.
   *
   * The latest release is the most recent non-prerelease, non-draft release, sorted by the `created_at` attribute. The `created_at` attribute is the date of the commit used for the release, and not the date when the release was drafted or published.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposGetLatestRelease()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetLatestRelease$Response(params: ReposGetLatestRelease$Params, context?: HttpContext): Observable<StrictHttpResponse<Release>> {
    return reposGetLatestRelease(this.http, this.rootUrl, params, context);
  }

  /**
   * Get the latest release.
   *
   * View the latest published full release for the repository.
   *
   * The latest release is the most recent non-prerelease, non-draft release, sorted by the `created_at` attribute. The `created_at` attribute is the date of the commit used for the release, and not the date when the release was drafted or published.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposGetLatestRelease$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetLatestRelease(params: ReposGetLatestRelease$Params, context?: HttpContext): Observable<Release> {
    return this.reposGetLatestRelease$Response(params, context).pipe(
      map((r: StrictHttpResponse<Release>): Release => r.body)
    );
  }

  /** Path part for operation `reposGetReleaseByTag()` */
  static readonly ReposGetReleaseByTagPath = '/repos/{owner}/{repo}/releases/tags/{tag}';

  /**
   * Get a release by tag name.
   *
   * Get a published release with the specified tag.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposGetReleaseByTag()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetReleaseByTag$Response(params: ReposGetReleaseByTag$Params, context?: HttpContext): Observable<StrictHttpResponse<Release>> {
    return reposGetReleaseByTag(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a release by tag name.
   *
   * Get a published release with the specified tag.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposGetReleaseByTag$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetReleaseByTag(params: ReposGetReleaseByTag$Params, context?: HttpContext): Observable<Release> {
    return this.reposGetReleaseByTag$Response(params, context).pipe(
      map((r: StrictHttpResponse<Release>): Release => r.body)
    );
  }

  /** Path part for operation `reposGetRelease()` */
  static readonly ReposGetReleasePath = '/repos/{owner}/{repo}/releases/{release_id}';

  /**
   * Get a release.
   *
   * **Note:** This returns an `upload_url` key corresponding to the endpoint for uploading release assets. This key is a [hypermedia resource](https://docs.github.com/rest/overview/resources-in-the-rest-api#hypermedia).
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposGetRelease()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetRelease$Response(params: ReposGetRelease$Params, context?: HttpContext): Observable<StrictHttpResponse<Release>> {
    return reposGetRelease(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a release.
   *
   * **Note:** This returns an `upload_url` key corresponding to the endpoint for uploading release assets. This key is a [hypermedia resource](https://docs.github.com/rest/overview/resources-in-the-rest-api#hypermedia).
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposGetRelease$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetRelease(params: ReposGetRelease$Params, context?: HttpContext): Observable<Release> {
    return this.reposGetRelease$Response(params, context).pipe(
      map((r: StrictHttpResponse<Release>): Release => r.body)
    );
  }

  /** Path part for operation `reposDeleteRelease()` */
  static readonly ReposDeleteReleasePath = '/repos/{owner}/{repo}/releases/{release_id}';

  /**
   * Delete a release.
   *
   * Users with push access to the repository can delete a release.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposDeleteRelease()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposDeleteRelease$Response(params: ReposDeleteRelease$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return reposDeleteRelease(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete a release.
   *
   * Users with push access to the repository can delete a release.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposDeleteRelease$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposDeleteRelease(params: ReposDeleteRelease$Params, context?: HttpContext): Observable<void> {
    return this.reposDeleteRelease$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `reposUpdateRelease()` */
  static readonly ReposUpdateReleasePath = '/repos/{owner}/{repo}/releases/{release_id}';

  /**
   * Update a release.
   *
   * Users with push access to the repository can edit a release.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposUpdateRelease()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposUpdateRelease$Response(params: ReposUpdateRelease$Params, context?: HttpContext): Observable<StrictHttpResponse<Release>> {
    return reposUpdateRelease(this.http, this.rootUrl, params, context);
  }

  /**
   * Update a release.
   *
   * Users with push access to the repository can edit a release.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposUpdateRelease$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposUpdateRelease(params: ReposUpdateRelease$Params, context?: HttpContext): Observable<Release> {
    return this.reposUpdateRelease$Response(params, context).pipe(
      map((r: StrictHttpResponse<Release>): Release => r.body)
    );
  }

  /** Path part for operation `reposListReleaseAssets()` */
  static readonly ReposListReleaseAssetsPath = '/repos/{owner}/{repo}/releases/{release_id}/assets';

  /**
   * List release assets.
   *
   *
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposListReleaseAssets()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposListReleaseAssets$Response(params: ReposListReleaseAssets$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<ReleaseAsset>>> {
    return reposListReleaseAssets(this.http, this.rootUrl, params, context);
  }

  /**
   * List release assets.
   *
   *
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposListReleaseAssets$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposListReleaseAssets(params: ReposListReleaseAssets$Params, context?: HttpContext): Observable<Array<ReleaseAsset>> {
    return this.reposListReleaseAssets$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<ReleaseAsset>>): Array<ReleaseAsset> => r.body)
    );
  }

  /** Path part for operation `reposUploadReleaseAsset()` */
  static readonly ReposUploadReleaseAssetPath = '/repos/{owner}/{repo}/releases/{release_id}/assets';

  /**
   * Upload a release asset.
   *
   * This endpoint makes use of [a Hypermedia relation](https://docs.github.com/rest/overview/resources-in-the-rest-api#hypermedia) to determine which URL to access. The endpoint you call to upload release assets is specific to your release. Use the `upload_url` returned in
   * the response of the [Create a release endpoint](https://docs.github.com/rest/releases/releases#create-a-release) to upload a release asset.
   *
   * You need to use an HTTP client which supports [SNI](http://en.wikipedia.org/wiki/Server_Name_Indication) to make calls to this endpoint.
   *
   * Most libraries will set the required `Content-Length` header automatically. Use the required `Content-Type` header to provide the media type of the asset. For a list of media types, see [Media Types](https://www.iana.org/assignments/media-types/media-types.xhtml). For example: 
   *
   * `application/zip`
   *
   * GitHub expects the asset data in its raw binary form, rather than JSON. You will send the raw binary content of the asset as the request body. Everything else about the endpoint is the same as the rest of the API. For example,
   * you'll still need to pass your authentication to be able to upload an asset.
   *
   * When an upstream failure occurs, you will receive a `502 Bad Gateway` status. This may leave an empty asset with a state of `starter`. It can be safely deleted.
   *
   * **Notes:**
   * *   GitHub renames asset filenames that have special characters, non-alphanumeric characters, and leading or trailing periods. The "[List release assets](https://docs.github.com/rest/releases/assets#list-release-assets)"
   * endpoint lists the renamed filenames. For more information and help, contact [GitHub Support](https://support.github.com/contact?tags=dotcom-rest-api).
   * *   To find the `release_id` query the [`GET /repos/{owner}/{repo}/releases/latest` endpoint](https://docs.github.com/rest/releases/releases#get-the-latest-release). 
   * *   If you upload an asset with the same filename as another uploaded asset, you'll receive an error and must delete the old file before you can re-upload the new asset.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposUploadReleaseAsset()` instead.
   *
   * This method sends `application/octet-stream` and handles request body of type `application/octet-stream`.
   */
  reposUploadReleaseAsset$Response(params: ReposUploadReleaseAsset$Params, context?: HttpContext): Observable<StrictHttpResponse<ReleaseAsset>> {
    return reposUploadReleaseAsset(this.http, this.rootUrl, params, context);
  }

  /**
   * Upload a release asset.
   *
   * This endpoint makes use of [a Hypermedia relation](https://docs.github.com/rest/overview/resources-in-the-rest-api#hypermedia) to determine which URL to access. The endpoint you call to upload release assets is specific to your release. Use the `upload_url` returned in
   * the response of the [Create a release endpoint](https://docs.github.com/rest/releases/releases#create-a-release) to upload a release asset.
   *
   * You need to use an HTTP client which supports [SNI](http://en.wikipedia.org/wiki/Server_Name_Indication) to make calls to this endpoint.
   *
   * Most libraries will set the required `Content-Length` header automatically. Use the required `Content-Type` header to provide the media type of the asset. For a list of media types, see [Media Types](https://www.iana.org/assignments/media-types/media-types.xhtml). For example: 
   *
   * `application/zip`
   *
   * GitHub expects the asset data in its raw binary form, rather than JSON. You will send the raw binary content of the asset as the request body. Everything else about the endpoint is the same as the rest of the API. For example,
   * you'll still need to pass your authentication to be able to upload an asset.
   *
   * When an upstream failure occurs, you will receive a `502 Bad Gateway` status. This may leave an empty asset with a state of `starter`. It can be safely deleted.
   *
   * **Notes:**
   * *   GitHub renames asset filenames that have special characters, non-alphanumeric characters, and leading or trailing periods. The "[List release assets](https://docs.github.com/rest/releases/assets#list-release-assets)"
   * endpoint lists the renamed filenames. For more information and help, contact [GitHub Support](https://support.github.com/contact?tags=dotcom-rest-api).
   * *   To find the `release_id` query the [`GET /repos/{owner}/{repo}/releases/latest` endpoint](https://docs.github.com/rest/releases/releases#get-the-latest-release). 
   * *   If you upload an asset with the same filename as another uploaded asset, you'll receive an error and must delete the old file before you can re-upload the new asset.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposUploadReleaseAsset$Response()` instead.
   *
   * This method sends `application/octet-stream` and handles request body of type `application/octet-stream`.
   */
  reposUploadReleaseAsset(params: ReposUploadReleaseAsset$Params, context?: HttpContext): Observable<ReleaseAsset> {
    return this.reposUploadReleaseAsset$Response(params, context).pipe(
      map((r: StrictHttpResponse<ReleaseAsset>): ReleaseAsset => r.body)
    );
  }

  /** Path part for operation `reposGetBranchRules()` */
  static readonly ReposGetBranchRulesPath = '/repos/{owner}/{repo}/rules/branches/{branch}';

  /**
   * Get rules for a branch.
   *
   * Returns all active rules that apply to the specified branch. The branch does not need to exist; rules that would apply
   * to a branch with that name will be returned. All active rules that apply will be returned, regardless of the level
   * at which they are configured (e.g. repository or organization). Rules in rulesets with "evaluate" or "disabled"
   * enforcement statuses are not returned.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposGetBranchRules()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetBranchRules$Response(params: ReposGetBranchRules$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<RepositoryRuleDetailed>>> {
    return reposGetBranchRules(this.http, this.rootUrl, params, context);
  }

  /**
   * Get rules for a branch.
   *
   * Returns all active rules that apply to the specified branch. The branch does not need to exist; rules that would apply
   * to a branch with that name will be returned. All active rules that apply will be returned, regardless of the level
   * at which they are configured (e.g. repository or organization). Rules in rulesets with "evaluate" or "disabled"
   * enforcement statuses are not returned.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposGetBranchRules$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetBranchRules(params: ReposGetBranchRules$Params, context?: HttpContext): Observable<Array<RepositoryRuleDetailed>> {
    return this.reposGetBranchRules$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<RepositoryRuleDetailed>>): Array<RepositoryRuleDetailed> => r.body)
    );
  }

  /** Path part for operation `reposGetRepoRulesets()` */
  static readonly ReposGetRepoRulesetsPath = '/repos/{owner}/{repo}/rulesets';

  /**
   * Get all repository rulesets.
   *
   * Get all the rulesets for a repository.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposGetRepoRulesets()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetRepoRulesets$Response(params: ReposGetRepoRulesets$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<RepositoryRuleset>>> {
    return reposGetRepoRulesets(this.http, this.rootUrl, params, context);
  }

  /**
   * Get all repository rulesets.
   *
   * Get all the rulesets for a repository.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposGetRepoRulesets$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetRepoRulesets(params: ReposGetRepoRulesets$Params, context?: HttpContext): Observable<Array<RepositoryRuleset>> {
    return this.reposGetRepoRulesets$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<RepositoryRuleset>>): Array<RepositoryRuleset> => r.body)
    );
  }

  /** Path part for operation `reposCreateRepoRuleset()` */
  static readonly ReposCreateRepoRulesetPath = '/repos/{owner}/{repo}/rulesets';

  /**
   * Create a repository ruleset.
   *
   * Create a ruleset for a repository.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposCreateRepoRuleset()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposCreateRepoRuleset$Response(params: ReposCreateRepoRuleset$Params, context?: HttpContext): Observable<StrictHttpResponse<RepositoryRuleset>> {
    return reposCreateRepoRuleset(this.http, this.rootUrl, params, context);
  }

  /**
   * Create a repository ruleset.
   *
   * Create a ruleset for a repository.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposCreateRepoRuleset$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposCreateRepoRuleset(params: ReposCreateRepoRuleset$Params, context?: HttpContext): Observable<RepositoryRuleset> {
    return this.reposCreateRepoRuleset$Response(params, context).pipe(
      map((r: StrictHttpResponse<RepositoryRuleset>): RepositoryRuleset => r.body)
    );
  }

  /** Path part for operation `reposGetRepoRuleset()` */
  static readonly ReposGetRepoRulesetPath = '/repos/{owner}/{repo}/rulesets/{ruleset_id}';

  /**
   * Get a repository ruleset.
   *
   * Get a ruleset for a repository.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposGetRepoRuleset()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetRepoRuleset$Response(params: ReposGetRepoRuleset$Params, context?: HttpContext): Observable<StrictHttpResponse<RepositoryRuleset>> {
    return reposGetRepoRuleset(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a repository ruleset.
   *
   * Get a ruleset for a repository.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposGetRepoRuleset$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetRepoRuleset(params: ReposGetRepoRuleset$Params, context?: HttpContext): Observable<RepositoryRuleset> {
    return this.reposGetRepoRuleset$Response(params, context).pipe(
      map((r: StrictHttpResponse<RepositoryRuleset>): RepositoryRuleset => r.body)
    );
  }

  /** Path part for operation `reposUpdateRepoRuleset()` */
  static readonly ReposUpdateRepoRulesetPath = '/repos/{owner}/{repo}/rulesets/{ruleset_id}';

  /**
   * Update a repository ruleset.
   *
   * Update a ruleset for a repository.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposUpdateRepoRuleset()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposUpdateRepoRuleset$Response(params: ReposUpdateRepoRuleset$Params, context?: HttpContext): Observable<StrictHttpResponse<RepositoryRuleset>> {
    return reposUpdateRepoRuleset(this.http, this.rootUrl, params, context);
  }

  /**
   * Update a repository ruleset.
   *
   * Update a ruleset for a repository.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposUpdateRepoRuleset$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposUpdateRepoRuleset(params: ReposUpdateRepoRuleset$Params, context?: HttpContext): Observable<RepositoryRuleset> {
    return this.reposUpdateRepoRuleset$Response(params, context).pipe(
      map((r: StrictHttpResponse<RepositoryRuleset>): RepositoryRuleset => r.body)
    );
  }

  /** Path part for operation `reposDeleteRepoRuleset()` */
  static readonly ReposDeleteRepoRulesetPath = '/repos/{owner}/{repo}/rulesets/{ruleset_id}';

  /**
   * Delete a repository ruleset.
   *
   * Delete a ruleset for a repository.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposDeleteRepoRuleset()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposDeleteRepoRuleset$Response(params: ReposDeleteRepoRuleset$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return reposDeleteRepoRuleset(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete a repository ruleset.
   *
   * Delete a ruleset for a repository.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposDeleteRepoRuleset$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposDeleteRepoRuleset(params: ReposDeleteRepoRuleset$Params, context?: HttpContext): Observable<void> {
    return this.reposDeleteRepoRuleset$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `reposGetCodeFrequencyStats()` */
  static readonly ReposGetCodeFrequencyStatsPath = '/repos/{owner}/{repo}/stats/code_frequency';

  /**
   * Get the weekly commit activity.
   *
   * Returns a weekly aggregate of the number of additions and deletions pushed to a repository.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposGetCodeFrequencyStats()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetCodeFrequencyStats$Response(params: ReposGetCodeFrequencyStats$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<CodeFrequencyStat>>> {
    return reposGetCodeFrequencyStats(this.http, this.rootUrl, params, context);
  }

  /**
   * Get the weekly commit activity.
   *
   * Returns a weekly aggregate of the number of additions and deletions pushed to a repository.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposGetCodeFrequencyStats$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetCodeFrequencyStats(params: ReposGetCodeFrequencyStats$Params, context?: HttpContext): Observable<Array<CodeFrequencyStat>> {
    return this.reposGetCodeFrequencyStats$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<CodeFrequencyStat>>): Array<CodeFrequencyStat> => r.body)
    );
  }

  /** Path part for operation `reposGetCommitActivityStats()` */
  static readonly ReposGetCommitActivityStatsPath = '/repos/{owner}/{repo}/stats/commit_activity';

  /**
   * Get the last year of commit activity.
   *
   * Returns the last year of commit activity grouped by week. The `days` array is a group of commits per day, starting on `Sunday`.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposGetCommitActivityStats()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetCommitActivityStats$Response(params: ReposGetCommitActivityStats$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<CommitActivity>>> {
    return reposGetCommitActivityStats(this.http, this.rootUrl, params, context);
  }

  /**
   * Get the last year of commit activity.
   *
   * Returns the last year of commit activity grouped by week. The `days` array is a group of commits per day, starting on `Sunday`.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposGetCommitActivityStats$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetCommitActivityStats(params: ReposGetCommitActivityStats$Params, context?: HttpContext): Observable<Array<CommitActivity>> {
    return this.reposGetCommitActivityStats$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<CommitActivity>>): Array<CommitActivity> => r.body)
    );
  }

  /** Path part for operation `reposGetContributorsStats()` */
  static readonly ReposGetContributorsStatsPath = '/repos/{owner}/{repo}/stats/contributors';

  /**
   * Get all contributor commit activity.
   *
   * Returns the `total` number of commits authored by the contributor. In addition, the response includes a Weekly Hash (`weeks` array) with the following information:
   *
   * *   `w` - Start of the week, given as a [Unix timestamp](http://en.wikipedia.org/wiki/Unix_time).
   * *   `a` - Number of additions
   * *   `d` - Number of deletions
   * *   `c` - Number of commits
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposGetContributorsStats()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetContributorsStats$Response(params: ReposGetContributorsStats$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<ContributorActivity>>> {
    return reposGetContributorsStats(this.http, this.rootUrl, params, context);
  }

  /**
   * Get all contributor commit activity.
   *
   * Returns the `total` number of commits authored by the contributor. In addition, the response includes a Weekly Hash (`weeks` array) with the following information:
   *
   * *   `w` - Start of the week, given as a [Unix timestamp](http://en.wikipedia.org/wiki/Unix_time).
   * *   `a` - Number of additions
   * *   `d` - Number of deletions
   * *   `c` - Number of commits
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposGetContributorsStats$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetContributorsStats(params: ReposGetContributorsStats$Params, context?: HttpContext): Observable<Array<ContributorActivity>> {
    return this.reposGetContributorsStats$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<ContributorActivity>>): Array<ContributorActivity> => r.body)
    );
  }

  /** Path part for operation `reposGetParticipationStats()` */
  static readonly ReposGetParticipationStatsPath = '/repos/{owner}/{repo}/stats/participation';

  /**
   * Get the weekly commit count.
   *
   * Returns the total commit counts for the `owner` and total commit counts in `all`. `all` is everyone combined, including the `owner` in the last 52 weeks. If you'd like to get the commit counts for non-owners, you can subtract `owner` from `all`.
   *
   * The array order is oldest week (index 0) to most recent week.
   *
   * The most recent week is seven days ago at UTC midnight to today at UTC midnight.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposGetParticipationStats()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetParticipationStats$Response(params: ReposGetParticipationStats$Params, context?: HttpContext): Observable<StrictHttpResponse<ParticipationStats>> {
    return reposGetParticipationStats(this.http, this.rootUrl, params, context);
  }

  /**
   * Get the weekly commit count.
   *
   * Returns the total commit counts for the `owner` and total commit counts in `all`. `all` is everyone combined, including the `owner` in the last 52 weeks. If you'd like to get the commit counts for non-owners, you can subtract `owner` from `all`.
   *
   * The array order is oldest week (index 0) to most recent week.
   *
   * The most recent week is seven days ago at UTC midnight to today at UTC midnight.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposGetParticipationStats$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetParticipationStats(params: ReposGetParticipationStats$Params, context?: HttpContext): Observable<ParticipationStats> {
    return this.reposGetParticipationStats$Response(params, context).pipe(
      map((r: StrictHttpResponse<ParticipationStats>): ParticipationStats => r.body)
    );
  }

  /** Path part for operation `reposGetPunchCardStats()` */
  static readonly ReposGetPunchCardStatsPath = '/repos/{owner}/{repo}/stats/punch_card';

  /**
   * Get the hourly commit count for each day.
   *
   * Each array contains the day number, hour number, and number of commits:
   *
   * *   `0-6`: Sunday - Saturday
   * *   `0-23`: Hour of day
   * *   Number of commits
   *
   * For example, `[2, 14, 25]` indicates that there were 25 total commits, during the 2:00pm hour on Tuesdays. All times are based on the time zone of individual commits.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposGetPunchCardStats()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetPunchCardStats$Response(params: ReposGetPunchCardStats$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<CodeFrequencyStat>>> {
    return reposGetPunchCardStats(this.http, this.rootUrl, params, context);
  }

  /**
   * Get the hourly commit count for each day.
   *
   * Each array contains the day number, hour number, and number of commits:
   *
   * *   `0-6`: Sunday - Saturday
   * *   `0-23`: Hour of day
   * *   Number of commits
   *
   * For example, `[2, 14, 25]` indicates that there were 25 total commits, during the 2:00pm hour on Tuesdays. All times are based on the time zone of individual commits.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposGetPunchCardStats$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetPunchCardStats(params: ReposGetPunchCardStats$Params, context?: HttpContext): Observable<Array<CodeFrequencyStat>> {
    return this.reposGetPunchCardStats$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<CodeFrequencyStat>>): Array<CodeFrequencyStat> => r.body)
    );
  }

  /** Path part for operation `reposCreateCommitStatus()` */
  static readonly ReposCreateCommitStatusPath = '/repos/{owner}/{repo}/statuses/{sha}';

  /**
   * Create a commit status.
   *
   * Users with push access in a repository can create commit statuses for a given SHA.
   *
   * Note: there is a limit of 1000 statuses per `sha` and `context` within a repository. Attempts to create more than 1000 statuses will result in a validation error.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposCreateCommitStatus()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposCreateCommitStatus$Response(params: ReposCreateCommitStatus$Params, context?: HttpContext): Observable<StrictHttpResponse<Status>> {
    return reposCreateCommitStatus(this.http, this.rootUrl, params, context);
  }

  /**
   * Create a commit status.
   *
   * Users with push access in a repository can create commit statuses for a given SHA.
   *
   * Note: there is a limit of 1000 statuses per `sha` and `context` within a repository. Attempts to create more than 1000 statuses will result in a validation error.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposCreateCommitStatus$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposCreateCommitStatus(params: ReposCreateCommitStatus$Params, context?: HttpContext): Observable<Status> {
    return this.reposCreateCommitStatus$Response(params, context).pipe(
      map((r: StrictHttpResponse<Status>): Status => r.body)
    );
  }

  /** Path part for operation `reposListTags()` */
  static readonly ReposListTagsPath = '/repos/{owner}/{repo}/tags';

  /**
   * List repository tags.
   *
   *
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposListTags()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposListTags$Response(params: ReposListTags$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Tag>>> {
    return reposListTags(this.http, this.rootUrl, params, context);
  }

  /**
   * List repository tags.
   *
   *
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposListTags$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposListTags(params: ReposListTags$Params, context?: HttpContext): Observable<Array<Tag>> {
    return this.reposListTags$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Tag>>): Array<Tag> => r.body)
    );
  }

  /** Path part for operation `reposListTagProtection()` */
  static readonly ReposListTagProtectionPath = '/repos/{owner}/{repo}/tags/protection';

  /**
   * List tag protection states for a repository.
   *
   * This returns the tag protection states of a repository.
   *
   * This information is only available to repository administrators.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposListTagProtection()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposListTagProtection$Response(params: ReposListTagProtection$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<TagProtection>>> {
    return reposListTagProtection(this.http, this.rootUrl, params, context);
  }

  /**
   * List tag protection states for a repository.
   *
   * This returns the tag protection states of a repository.
   *
   * This information is only available to repository administrators.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposListTagProtection$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposListTagProtection(params: ReposListTagProtection$Params, context?: HttpContext): Observable<Array<TagProtection>> {
    return this.reposListTagProtection$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<TagProtection>>): Array<TagProtection> => r.body)
    );
  }

  /** Path part for operation `reposCreateTagProtection()` */
  static readonly ReposCreateTagProtectionPath = '/repos/{owner}/{repo}/tags/protection';

  /**
   * Create a tag protection state for a repository.
   *
   * This creates a tag protection state for a repository.
   * This endpoint is only available to repository administrators.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposCreateTagProtection()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposCreateTagProtection$Response(params: ReposCreateTagProtection$Params, context?: HttpContext): Observable<StrictHttpResponse<TagProtection>> {
    return reposCreateTagProtection(this.http, this.rootUrl, params, context);
  }

  /**
   * Create a tag protection state for a repository.
   *
   * This creates a tag protection state for a repository.
   * This endpoint is only available to repository administrators.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposCreateTagProtection$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposCreateTagProtection(params: ReposCreateTagProtection$Params, context?: HttpContext): Observable<TagProtection> {
    return this.reposCreateTagProtection$Response(params, context).pipe(
      map((r: StrictHttpResponse<TagProtection>): TagProtection => r.body)
    );
  }

  /** Path part for operation `reposDeleteTagProtection()` */
  static readonly ReposDeleteTagProtectionPath = '/repos/{owner}/{repo}/tags/protection/{tag_protection_id}';

  /**
   * Delete a tag protection state for a repository.
   *
   * This deletes a tag protection state for a repository.
   * This endpoint is only available to repository administrators.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposDeleteTagProtection()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposDeleteTagProtection$Response(params: ReposDeleteTagProtection$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return reposDeleteTagProtection(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete a tag protection state for a repository.
   *
   * This deletes a tag protection state for a repository.
   * This endpoint is only available to repository administrators.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposDeleteTagProtection$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposDeleteTagProtection(params: ReposDeleteTagProtection$Params, context?: HttpContext): Observable<void> {
    return this.reposDeleteTagProtection$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `reposDownloadTarballArchive()` */
  static readonly ReposDownloadTarballArchivePath = '/repos/{owner}/{repo}/tarball/{ref}';

  /**
   * Download a repository archive (tar).
   *
   * Gets a redirect URL to download a tar archive for a repository. If you omit `:ref`, the repository’s default branch (usually
   * `main`) will be used. Please make sure your HTTP framework is configured to follow redirects or you will need to use
   * the `Location` header to make a second `GET` request.
   * **Note**: For private repositories, these links are temporary and expire after five minutes.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposDownloadTarballArchive()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposDownloadTarballArchive$Response(params: ReposDownloadTarballArchive$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return reposDownloadTarballArchive(this.http, this.rootUrl, params, context);
  }

  /**
   * Download a repository archive (tar).
   *
   * Gets a redirect URL to download a tar archive for a repository. If you omit `:ref`, the repository’s default branch (usually
   * `main`) will be used. Please make sure your HTTP framework is configured to follow redirects or you will need to use
   * the `Location` header to make a second `GET` request.
   * **Note**: For private repositories, these links are temporary and expire after five minutes.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposDownloadTarballArchive$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposDownloadTarballArchive(params: ReposDownloadTarballArchive$Params, context?: HttpContext): Observable<void> {
    return this.reposDownloadTarballArchive$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `reposListTeams()` */
  static readonly ReposListTeamsPath = '/repos/{owner}/{repo}/teams';

  /**
   * List repository teams.
   *
   * Lists the teams that have access to the specified repository and that are also visible to the authenticated user.
   *
   * For a public repository, a team is listed only if that team added the public repository explicitly.
   *
   * Personal access tokens require the following scopes:
   * * `public_repo` to call this endpoint on a public repository
   * * `repo` to call this endpoint on a private repository (this scope also includes public repositories)
   *
   * This endpoint is not compatible with fine-grained personal access tokens.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposListTeams()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposListTeams$Response(params: ReposListTeams$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Team>>> {
    return reposListTeams(this.http, this.rootUrl, params, context);
  }

  /**
   * List repository teams.
   *
   * Lists the teams that have access to the specified repository and that are also visible to the authenticated user.
   *
   * For a public repository, a team is listed only if that team added the public repository explicitly.
   *
   * Personal access tokens require the following scopes:
   * * `public_repo` to call this endpoint on a public repository
   * * `repo` to call this endpoint on a private repository (this scope also includes public repositories)
   *
   * This endpoint is not compatible with fine-grained personal access tokens.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposListTeams$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposListTeams(params: ReposListTeams$Params, context?: HttpContext): Observable<Array<Team>> {
    return this.reposListTeams$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Team>>): Array<Team> => r.body)
    );
  }

  /** Path part for operation `reposGetAllTopics()` */
  static readonly ReposGetAllTopicsPath = '/repos/{owner}/{repo}/topics';

  /**
   * Get all repository topics.
   *
   *
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposGetAllTopics()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetAllTopics$Response(params: ReposGetAllTopics$Params, context?: HttpContext): Observable<StrictHttpResponse<Topic>> {
    return reposGetAllTopics(this.http, this.rootUrl, params, context);
  }

  /**
   * Get all repository topics.
   *
   *
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposGetAllTopics$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetAllTopics(params: ReposGetAllTopics$Params, context?: HttpContext): Observable<Topic> {
    return this.reposGetAllTopics$Response(params, context).pipe(
      map((r: StrictHttpResponse<Topic>): Topic => r.body)
    );
  }

  /** Path part for operation `reposReplaceAllTopics()` */
  static readonly ReposReplaceAllTopicsPath = '/repos/{owner}/{repo}/topics';

  /**
   * Replace all repository topics.
   *
   *
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposReplaceAllTopics()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposReplaceAllTopics$Response(params: ReposReplaceAllTopics$Params, context?: HttpContext): Observable<StrictHttpResponse<Topic>> {
    return reposReplaceAllTopics(this.http, this.rootUrl, params, context);
  }

  /**
   * Replace all repository topics.
   *
   *
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposReplaceAllTopics$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposReplaceAllTopics(params: ReposReplaceAllTopics$Params, context?: HttpContext): Observable<Topic> {
    return this.reposReplaceAllTopics$Response(params, context).pipe(
      map((r: StrictHttpResponse<Topic>): Topic => r.body)
    );
  }

  /** Path part for operation `reposGetClones()` */
  static readonly ReposGetClonesPath = '/repos/{owner}/{repo}/traffic/clones';

  /**
   * Get repository clones.
   *
   * Get the total number of clones and breakdown per day or week for the last 14 days. Timestamps are aligned to UTC midnight of the beginning of the day or week. Week begins on Monday.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposGetClones()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetClones$Response(params: ReposGetClones$Params, context?: HttpContext): Observable<StrictHttpResponse<CloneTraffic>> {
    return reposGetClones(this.http, this.rootUrl, params, context);
  }

  /**
   * Get repository clones.
   *
   * Get the total number of clones and breakdown per day or week for the last 14 days. Timestamps are aligned to UTC midnight of the beginning of the day or week. Week begins on Monday.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposGetClones$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetClones(params: ReposGetClones$Params, context?: HttpContext): Observable<CloneTraffic> {
    return this.reposGetClones$Response(params, context).pipe(
      map((r: StrictHttpResponse<CloneTraffic>): CloneTraffic => r.body)
    );
  }

  /** Path part for operation `reposGetTopPaths()` */
  static readonly ReposGetTopPathsPath = '/repos/{owner}/{repo}/traffic/popular/paths';

  /**
   * Get top referral paths.
   *
   * Get the top 10 popular contents over the last 14 days.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposGetTopPaths()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetTopPaths$Response(params: ReposGetTopPaths$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<ContentTraffic>>> {
    return reposGetTopPaths(this.http, this.rootUrl, params, context);
  }

  /**
   * Get top referral paths.
   *
   * Get the top 10 popular contents over the last 14 days.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposGetTopPaths$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetTopPaths(params: ReposGetTopPaths$Params, context?: HttpContext): Observable<Array<ContentTraffic>> {
    return this.reposGetTopPaths$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<ContentTraffic>>): Array<ContentTraffic> => r.body)
    );
  }

  /** Path part for operation `reposGetTopReferrers()` */
  static readonly ReposGetTopReferrersPath = '/repos/{owner}/{repo}/traffic/popular/referrers';

  /**
   * Get top referral sources.
   *
   * Get the top 10 referrers over the last 14 days.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposGetTopReferrers()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetTopReferrers$Response(params: ReposGetTopReferrers$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<ReferrerTraffic>>> {
    return reposGetTopReferrers(this.http, this.rootUrl, params, context);
  }

  /**
   * Get top referral sources.
   *
   * Get the top 10 referrers over the last 14 days.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposGetTopReferrers$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetTopReferrers(params: ReposGetTopReferrers$Params, context?: HttpContext): Observable<Array<ReferrerTraffic>> {
    return this.reposGetTopReferrers$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<ReferrerTraffic>>): Array<ReferrerTraffic> => r.body)
    );
  }

  /** Path part for operation `reposGetViews()` */
  static readonly ReposGetViewsPath = '/repos/{owner}/{repo}/traffic/views';

  /**
   * Get page views.
   *
   * Get the total number of views and breakdown per day or week for the last 14 days. Timestamps are aligned to UTC midnight of the beginning of the day or week. Week begins on Monday.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposGetViews()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetViews$Response(params: ReposGetViews$Params, context?: HttpContext): Observable<StrictHttpResponse<ViewTraffic>> {
    return reposGetViews(this.http, this.rootUrl, params, context);
  }

  /**
   * Get page views.
   *
   * Get the total number of views and breakdown per day or week for the last 14 days. Timestamps are aligned to UTC midnight of the beginning of the day or week. Week begins on Monday.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposGetViews$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposGetViews(params: ReposGetViews$Params, context?: HttpContext): Observable<ViewTraffic> {
    return this.reposGetViews$Response(params, context).pipe(
      map((r: StrictHttpResponse<ViewTraffic>): ViewTraffic => r.body)
    );
  }

  /** Path part for operation `reposTransfer()` */
  static readonly ReposTransferPath = '/repos/{owner}/{repo}/transfer';

  /**
   * Transfer a repository.
   *
   * A transfer request will need to be accepted by the new owner when transferring a personal repository to another user. The response will contain the original `owner`, and the transfer will continue asynchronously. For more details on the requirements to transfer personal and organization-owned repositories, see [about repository transfers](https://docs.github.com/articles/about-repository-transfers/).
   * You must use a personal access token (classic) or an OAuth token for this endpoint. An installation access token or a fine-grained personal access token cannot be used because they are only granted access to a single account.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposTransfer()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposTransfer$Response(params: ReposTransfer$Params, context?: HttpContext): Observable<StrictHttpResponse<MinimalRepository>> {
    return reposTransfer(this.http, this.rootUrl, params, context);
  }

  /**
   * Transfer a repository.
   *
   * A transfer request will need to be accepted by the new owner when transferring a personal repository to another user. The response will contain the original `owner`, and the transfer will continue asynchronously. For more details on the requirements to transfer personal and organization-owned repositories, see [about repository transfers](https://docs.github.com/articles/about-repository-transfers/).
   * You must use a personal access token (classic) or an OAuth token for this endpoint. An installation access token or a fine-grained personal access token cannot be used because they are only granted access to a single account.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposTransfer$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposTransfer(params: ReposTransfer$Params, context?: HttpContext): Observable<MinimalRepository> {
    return this.reposTransfer$Response(params, context).pipe(
      map((r: StrictHttpResponse<MinimalRepository>): MinimalRepository => r.body)
    );
  }

  /** Path part for operation `reposCheckVulnerabilityAlerts()` */
  static readonly ReposCheckVulnerabilityAlertsPath = '/repos/{owner}/{repo}/vulnerability-alerts';

  /**
   * Check if vulnerability alerts are enabled for a repository.
   *
   * Shows whether dependency alerts are enabled or disabled for a repository. The authenticated user must have admin read access to the repository. For more information, see "[About security alerts for vulnerable dependencies](https://docs.github.com/articles/about-security-alerts-for-vulnerable-dependencies)".
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposCheckVulnerabilityAlerts()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposCheckVulnerabilityAlerts$Response(params: ReposCheckVulnerabilityAlerts$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return reposCheckVulnerabilityAlerts(this.http, this.rootUrl, params, context);
  }

  /**
   * Check if vulnerability alerts are enabled for a repository.
   *
   * Shows whether dependency alerts are enabled or disabled for a repository. The authenticated user must have admin read access to the repository. For more information, see "[About security alerts for vulnerable dependencies](https://docs.github.com/articles/about-security-alerts-for-vulnerable-dependencies)".
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposCheckVulnerabilityAlerts$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposCheckVulnerabilityAlerts(params: ReposCheckVulnerabilityAlerts$Params, context?: HttpContext): Observable<void> {
    return this.reposCheckVulnerabilityAlerts$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `reposEnableVulnerabilityAlerts()` */
  static readonly ReposEnableVulnerabilityAlertsPath = '/repos/{owner}/{repo}/vulnerability-alerts';

  /**
   * Enable vulnerability alerts.
   *
   * Enables dependency alerts and the dependency graph for a repository. The authenticated user must have admin access to the repository. For more information, see "[About security alerts for vulnerable dependencies](https://docs.github.com/articles/about-security-alerts-for-vulnerable-dependencies)".
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposEnableVulnerabilityAlerts()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposEnableVulnerabilityAlerts$Response(params: ReposEnableVulnerabilityAlerts$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return reposEnableVulnerabilityAlerts(this.http, this.rootUrl, params, context);
  }

  /**
   * Enable vulnerability alerts.
   *
   * Enables dependency alerts and the dependency graph for a repository. The authenticated user must have admin access to the repository. For more information, see "[About security alerts for vulnerable dependencies](https://docs.github.com/articles/about-security-alerts-for-vulnerable-dependencies)".
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposEnableVulnerabilityAlerts$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposEnableVulnerabilityAlerts(params: ReposEnableVulnerabilityAlerts$Params, context?: HttpContext): Observable<void> {
    return this.reposEnableVulnerabilityAlerts$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `reposDisableVulnerabilityAlerts()` */
  static readonly ReposDisableVulnerabilityAlertsPath = '/repos/{owner}/{repo}/vulnerability-alerts';

  /**
   * Disable vulnerability alerts.
   *
   * Disables dependency alerts and the dependency graph for a repository.
   * The authenticated user must have admin access to the repository. For more information,
   * see "[About security alerts for vulnerable dependencies](https://docs.github.com/articles/about-security-alerts-for-vulnerable-dependencies)".
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposDisableVulnerabilityAlerts()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposDisableVulnerabilityAlerts$Response(params: ReposDisableVulnerabilityAlerts$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return reposDisableVulnerabilityAlerts(this.http, this.rootUrl, params, context);
  }

  /**
   * Disable vulnerability alerts.
   *
   * Disables dependency alerts and the dependency graph for a repository.
   * The authenticated user must have admin access to the repository. For more information,
   * see "[About security alerts for vulnerable dependencies](https://docs.github.com/articles/about-security-alerts-for-vulnerable-dependencies)".
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposDisableVulnerabilityAlerts$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposDisableVulnerabilityAlerts(params: ReposDisableVulnerabilityAlerts$Params, context?: HttpContext): Observable<void> {
    return this.reposDisableVulnerabilityAlerts$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `reposDownloadZipballArchive()` */
  static readonly ReposDownloadZipballArchivePath = '/repos/{owner}/{repo}/zipball/{ref}';

  /**
   * Download a repository archive (zip).
   *
   * Gets a redirect URL to download a zip archive for a repository. If you omit `:ref`, the repository’s default branch (usually
   * `main`) will be used. Please make sure your HTTP framework is configured to follow redirects or you will need to use
   * the `Location` header to make a second `GET` request.
   *
   * **Note**: For private repositories, these links are temporary and expire after five minutes. If the repository is empty, you will receive a 404 when you follow the redirect.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposDownloadZipballArchive()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposDownloadZipballArchive$Response(params: ReposDownloadZipballArchive$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return reposDownloadZipballArchive(this.http, this.rootUrl, params, context);
  }

  /**
   * Download a repository archive (zip).
   *
   * Gets a redirect URL to download a zip archive for a repository. If you omit `:ref`, the repository’s default branch (usually
   * `main`) will be used. Please make sure your HTTP framework is configured to follow redirects or you will need to use
   * the `Location` header to make a second `GET` request.
   *
   * **Note**: For private repositories, these links are temporary and expire after five minutes. If the repository is empty, you will receive a 404 when you follow the redirect.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposDownloadZipballArchive$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposDownloadZipballArchive(params: ReposDownloadZipballArchive$Params, context?: HttpContext): Observable<void> {
    return this.reposDownloadZipballArchive$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `reposCreateUsingTemplate()` */
  static readonly ReposCreateUsingTemplatePath = '/repos/{template_owner}/{template_repo}/generate';

  /**
   * Create a repository using a template.
   *
   * Creates a new repository using a repository template. Use the `template_owner` and `template_repo` route parameters to specify the repository to use as the template. If the repository is not public, the authenticated user must own or be a member of an organization that owns the repository. To check if a repository is available to use as a template, get the repository's information using the [Get a repository](https://docs.github.com/rest/repos/repos#get-a-repository) endpoint and check that the `is_template` key is `true`.
   *
   * **OAuth scope requirements**
   *
   * When using [OAuth](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/), authorizations must include:
   *
   * *   `public_repo` scope or `repo` scope to create a public repository. Note: For GitHub AE, use `repo` scope to create an internal repository.
   * *   `repo` scope to create a private repository
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposCreateUsingTemplate()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposCreateUsingTemplate$Response(params: ReposCreateUsingTemplate$Params, context?: HttpContext): Observable<StrictHttpResponse<Repository>> {
    return reposCreateUsingTemplate(this.http, this.rootUrl, params, context);
  }

  /**
   * Create a repository using a template.
   *
   * Creates a new repository using a repository template. Use the `template_owner` and `template_repo` route parameters to specify the repository to use as the template. If the repository is not public, the authenticated user must own or be a member of an organization that owns the repository. To check if a repository is available to use as a template, get the repository's information using the [Get a repository](https://docs.github.com/rest/repos/repos#get-a-repository) endpoint and check that the `is_template` key is `true`.
   *
   * **OAuth scope requirements**
   *
   * When using [OAuth](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/), authorizations must include:
   *
   * *   `public_repo` scope or `repo` scope to create a public repository. Note: For GitHub AE, use `repo` scope to create an internal repository.
   * *   `repo` scope to create a private repository
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposCreateUsingTemplate$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposCreateUsingTemplate(params: ReposCreateUsingTemplate$Params, context?: HttpContext): Observable<Repository> {
    return this.reposCreateUsingTemplate$Response(params, context).pipe(
      map((r: StrictHttpResponse<Repository>): Repository => r.body)
    );
  }

  /** Path part for operation `reposListPublic()` */
  static readonly ReposListPublicPath = '/repositories';

  /**
   * List public repositories.
   *
   * Lists all public repositories in the order that they were created.
   *
   * Note:
   * - For GitHub Enterprise Server, this endpoint will only list repositories available to all users on the enterprise.
   * - Pagination is powered exclusively by the `since` parameter. Use the [Link header](https://docs.github.com/rest/guides/using-pagination-in-the-rest-api#using-link-headers) to get the URL for the next page of repositories.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposListPublic()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposListPublic$Response(params?: ReposListPublic$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<MinimalRepository>>> {
    return reposListPublic(this.http, this.rootUrl, params, context);
  }

  /**
   * List public repositories.
   *
   * Lists all public repositories in the order that they were created.
   *
   * Note:
   * - For GitHub Enterprise Server, this endpoint will only list repositories available to all users on the enterprise.
   * - Pagination is powered exclusively by the `since` parameter. Use the [Link header](https://docs.github.com/rest/guides/using-pagination-in-the-rest-api#using-link-headers) to get the URL for the next page of repositories.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposListPublic$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposListPublic(params?: ReposListPublic$Params, context?: HttpContext): Observable<Array<MinimalRepository>> {
    return this.reposListPublic$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<MinimalRepository>>): Array<MinimalRepository> => r.body)
    );
  }

  /** Path part for operation `reposListForAuthenticatedUser()` */
  static readonly ReposListForAuthenticatedUserPath = '/user/repos';

  /**
   * List repositories for the authenticated user.
   *
   * Lists repositories that the authenticated user has explicit permission (`:read`, `:write`, or `:admin`) to access.
   *
   * The authenticated user has explicit permission to access repositories they own, repositories where they are a collaborator, and repositories that they can access through an organization membership.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposListForAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposListForAuthenticatedUser$Response(params?: ReposListForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Repository>>> {
    return reposListForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * List repositories for the authenticated user.
   *
   * Lists repositories that the authenticated user has explicit permission (`:read`, `:write`, or `:admin`) to access.
   *
   * The authenticated user has explicit permission to access repositories they own, repositories where they are a collaborator, and repositories that they can access through an organization membership.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposListForAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposListForAuthenticatedUser(params?: ReposListForAuthenticatedUser$Params, context?: HttpContext): Observable<Array<Repository>> {
    return this.reposListForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Repository>>): Array<Repository> => r.body)
    );
  }

  /** Path part for operation `reposCreateForAuthenticatedUser()` */
  static readonly ReposCreateForAuthenticatedUserPath = '/user/repos';

  /**
   * Create a repository for the authenticated user.
   *
   * Creates a new repository for the authenticated user.
   *
   * **OAuth scope requirements**
   *
   * When using [OAuth](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/), authorizations must include:
   *
   * *   `public_repo` scope or `repo` scope to create a public repository. Note: For GitHub AE, use `repo` scope to create an internal repository.
   * *   `repo` scope to create a private repository.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposCreateForAuthenticatedUser()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposCreateForAuthenticatedUser$Response(params: ReposCreateForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Repository>> {
    return reposCreateForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Create a repository for the authenticated user.
   *
   * Creates a new repository for the authenticated user.
   *
   * **OAuth scope requirements**
   *
   * When using [OAuth](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/), authorizations must include:
   *
   * *   `public_repo` scope or `repo` scope to create a public repository. Note: For GitHub AE, use `repo` scope to create an internal repository.
   * *   `repo` scope to create a private repository.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposCreateForAuthenticatedUser$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reposCreateForAuthenticatedUser(params: ReposCreateForAuthenticatedUser$Params, context?: HttpContext): Observable<Repository> {
    return this.reposCreateForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<Repository>): Repository => r.body)
    );
  }

  /** Path part for operation `reposListInvitationsForAuthenticatedUser()` */
  static readonly ReposListInvitationsForAuthenticatedUserPath = '/user/repository_invitations';

  /**
   * List repository invitations for the authenticated user.
   *
   * When authenticating as a user, this endpoint will list all currently open repository invitations for that user.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposListInvitationsForAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposListInvitationsForAuthenticatedUser$Response(params?: ReposListInvitationsForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<RepositoryInvitation>>> {
    return reposListInvitationsForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * List repository invitations for the authenticated user.
   *
   * When authenticating as a user, this endpoint will list all currently open repository invitations for that user.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposListInvitationsForAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposListInvitationsForAuthenticatedUser(params?: ReposListInvitationsForAuthenticatedUser$Params, context?: HttpContext): Observable<Array<RepositoryInvitation>> {
    return this.reposListInvitationsForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<RepositoryInvitation>>): Array<RepositoryInvitation> => r.body)
    );
  }

  /** Path part for operation `reposDeclineInvitationForAuthenticatedUser()` */
  static readonly ReposDeclineInvitationForAuthenticatedUserPath = '/user/repository_invitations/{invitation_id}';

  /**
   * Decline a repository invitation.
   *
   *
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposDeclineInvitationForAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposDeclineInvitationForAuthenticatedUser$Response(params: ReposDeclineInvitationForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return reposDeclineInvitationForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Decline a repository invitation.
   *
   *
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposDeclineInvitationForAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposDeclineInvitationForAuthenticatedUser(params: ReposDeclineInvitationForAuthenticatedUser$Params, context?: HttpContext): Observable<void> {
    return this.reposDeclineInvitationForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `reposAcceptInvitationForAuthenticatedUser()` */
  static readonly ReposAcceptInvitationForAuthenticatedUserPath = '/user/repository_invitations/{invitation_id}';

  /**
   * Accept a repository invitation.
   *
   *
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposAcceptInvitationForAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposAcceptInvitationForAuthenticatedUser$Response(params: ReposAcceptInvitationForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return reposAcceptInvitationForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Accept a repository invitation.
   *
   *
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposAcceptInvitationForAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposAcceptInvitationForAuthenticatedUser(params: ReposAcceptInvitationForAuthenticatedUser$Params, context?: HttpContext): Observable<void> {
    return this.reposAcceptInvitationForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `reposListForUser()` */
  static readonly ReposListForUserPath = '/users/{username}/repos';

  /**
   * List repositories for a user.
   *
   * Lists public repositories for the specified user. Note: For GitHub AE, this endpoint will list internal repositories for the specified user.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reposListForUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposListForUser$Response(params: ReposListForUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<MinimalRepository>>> {
    return reposListForUser(this.http, this.rootUrl, params, context);
  }

  /**
   * List repositories for a user.
   *
   * Lists public repositories for the specified user. Note: For GitHub AE, this endpoint will list internal repositories for the specified user.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reposListForUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reposListForUser(params: ReposListForUser$Params, context?: HttpContext): Observable<Array<MinimalRepository>> {
    return this.reposListForUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<MinimalRepository>>): Array<MinimalRepository> => r.body)
    );
  }

}
