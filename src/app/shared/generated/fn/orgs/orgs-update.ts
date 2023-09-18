/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { OrganizationFull } from '../../models/organization-full';

export interface OrgsUpdate$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;
      body?: {

/**
 * Billing email address. This address is not publicized.
 */
'billing_email'?: string;

/**
 * The company name.
 */
'company'?: string;

/**
 * The publicly visible email address.
 */
'email'?: string;

/**
 * The Twitter username of the company.
 */
'twitter_username'?: string;

/**
 * The location.
 */
'location'?: string;

/**
 * The shorthand name of the company.
 */
'name'?: string;

/**
 * The description of the company.
 */
'description'?: string;

/**
 * Whether an organization can use organization projects.
 */
'has_organization_projects'?: boolean;

/**
 * Whether repositories that belong to the organization can use repository projects.
 */
'has_repository_projects'?: boolean;

/**
 * Default permission level members have for organization repositories.
 */
'default_repository_permission'?: 'read' | 'write' | 'admin' | 'none';

/**
 * Whether of non-admin organization members can create repositories. **Note:** A parameter can override this parameter. See `members_allowed_repository_creation_type` in this table for details.
 */
'members_can_create_repositories'?: boolean;

/**
 * Whether organization members can create internal repositories, which are visible to all enterprise members. You can only allow members to create internal repositories if your organization is associated with an enterprise account using GitHub Enterprise Cloud or GitHub Enterprise Server 2.20+. For more information, see "[Restricting repository creation in your organization](https://docs.github.com/github/setting-up-and-managing-organizations-and-teams/restricting-repository-creation-in-your-organization)" in the GitHub Help documentation.
 */
'members_can_create_internal_repositories'?: boolean;

/**
 * Whether organization members can create private repositories, which are visible to organization members with permission. For more information, see "[Restricting repository creation in your organization](https://docs.github.com/github/setting-up-and-managing-organizations-and-teams/restricting-repository-creation-in-your-organization)" in the GitHub Help documentation.
 */
'members_can_create_private_repositories'?: boolean;

/**
 * Whether organization members can create public repositories, which are visible to anyone. For more information, see "[Restricting repository creation in your organization](https://docs.github.com/github/setting-up-and-managing-organizations-and-teams/restricting-repository-creation-in-your-organization)" in the GitHub Help documentation.
 */
'members_can_create_public_repositories'?: boolean;

/**
 * Specifies which types of repositories non-admin organization members can create. `private` is only available to repositories that are part of an organization on GitHub Enterprise Cloud. 
 * **Note:** This parameter is deprecated and will be removed in the future. Its return value ignores internal repositories. Using this parameter overrides values set in `members_can_create_repositories`. See the parameter deprecation notice in the operation description for details.
 */
'members_allowed_repository_creation_type'?: 'all' | 'private' | 'none';

/**
 * Whether organization members can create GitHub Pages sites. Existing published sites will not be impacted.
 */
'members_can_create_pages'?: boolean;

/**
 * Whether organization members can create public GitHub Pages sites. Existing published sites will not be impacted.
 */
'members_can_create_public_pages'?: boolean;

/**
 * Whether organization members can create private GitHub Pages sites. Existing published sites will not be impacted.
 */
'members_can_create_private_pages'?: boolean;

/**
 * Whether organization members can fork private organization repositories.
 */
'members_can_fork_private_repositories'?: boolean;

/**
 * Whether contributors to organization repositories are required to sign off on commits they make through GitHub's web interface.
 */
'web_commit_signoff_required'?: boolean;
'blog'?: string;

/**
 * Whether GitHub Advanced Security is automatically enabled for new repositories.
 *
 * To use this parameter, you must have admin permissions for the repository or be an owner or security manager for the organization that owns the repository. For more information, see "[Managing security managers in your organization](https://docs.github.com/organizations/managing-peoples-access-to-your-organization-with-roles/managing-security-managers-in-your-organization)."
 *
 * You can check which security and analysis features are currently enabled by using a `GET /orgs/{org}` request.
 */
'advanced_security_enabled_for_new_repositories'?: boolean;

/**
 * Whether Dependabot alerts is automatically enabled for new repositories.
 *
 * To use this parameter, you must have admin permissions for the repository or be an owner or security manager for the organization that owns the repository. For more information, see "[Managing security managers in your organization](https://docs.github.com/organizations/managing-peoples-access-to-your-organization-with-roles/managing-security-managers-in-your-organization)."
 *
 * You can check which security and analysis features are currently enabled by using a `GET /orgs/{org}` request.
 */
'dependabot_alerts_enabled_for_new_repositories'?: boolean;

/**
 * Whether Dependabot security updates is automatically enabled for new repositories.
 *
 * To use this parameter, you must have admin permissions for the repository or be an owner or security manager for the organization that owns the repository. For more information, see "[Managing security managers in your organization](https://docs.github.com/organizations/managing-peoples-access-to-your-organization-with-roles/managing-security-managers-in-your-organization)."
 *
 * You can check which security and analysis features are currently enabled by using a `GET /orgs/{org}` request.
 */
'dependabot_security_updates_enabled_for_new_repositories'?: boolean;

/**
 * Whether dependency graph is automatically enabled for new repositories.
 *
 * To use this parameter, you must have admin permissions for the repository or be an owner or security manager for the organization that owns the repository. For more information, see "[Managing security managers in your organization](https://docs.github.com/organizations/managing-peoples-access-to-your-organization-with-roles/managing-security-managers-in-your-organization)."
 *
 * You can check which security and analysis features are currently enabled by using a `GET /orgs/{org}` request.
 */
'dependency_graph_enabled_for_new_repositories'?: boolean;

/**
 * Whether secret scanning is automatically enabled for new repositories.
 *
 * To use this parameter, you must have admin permissions for the repository or be an owner or security manager for the organization that owns the repository. For more information, see "[Managing security managers in your organization](https://docs.github.com/organizations/managing-peoples-access-to-your-organization-with-roles/managing-security-managers-in-your-organization)."
 *
 * You can check which security and analysis features are currently enabled by using a `GET /orgs/{org}` request.
 */
'secret_scanning_enabled_for_new_repositories'?: boolean;

/**
 * Whether secret scanning push protection is automatically enabled for new repositories.
 *
 * To use this parameter, you must have admin permissions for the repository or be an owner or security manager for the organization that owns the repository. For more information, see "[Managing security managers in your organization](https://docs.github.com/organizations/managing-peoples-access-to-your-organization-with-roles/managing-security-managers-in-your-organization)."
 *
 * You can check which security and analysis features are currently enabled by using a `GET /orgs/{org}` request.
 */
'secret_scanning_push_protection_enabled_for_new_repositories'?: boolean;

/**
 * Whether a custom link is shown to contributors who are blocked from pushing a secret by push protection.
 */
'secret_scanning_push_protection_custom_link_enabled'?: boolean;

/**
 * If `secret_scanning_push_protection_custom_link_enabled` is true, the URL that will be displayed to contributors who are blocked from pushing a secret.
 */
'secret_scanning_push_protection_custom_link'?: string;
}
}

export function orgsUpdate(http: HttpClient, rootUrl: string, params: OrgsUpdate$Params, context?: HttpContext): Observable<StrictHttpResponse<OrganizationFull>> {
  const rb = new RequestBuilder(rootUrl, orgsUpdate.PATH, 'patch');
  if (params) {
    rb.path('org', params.org, {});
    rb.body(params.body, 'application/json');
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<OrganizationFull>;
    })
  );
}

orgsUpdate.PATH = '/orgs/{org}';
