/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { BaseService } from '../base-service';
import { ApiConfiguration } from '../api-configuration';
import { StrictHttpResponse } from '../strict-http-response';

import { Package } from '../models/package';
import { PackageVersion } from '../models/package-version';
import { packagesDeletePackageForAuthenticatedUser } from '../fn/packages/packages-delete-package-for-authenticated-user';
import { PackagesDeletePackageForAuthenticatedUser$Params } from '../fn/packages/packages-delete-package-for-authenticated-user';
import { packagesDeletePackageForOrg } from '../fn/packages/packages-delete-package-for-org';
import { PackagesDeletePackageForOrg$Params } from '../fn/packages/packages-delete-package-for-org';
import { packagesDeletePackageForUser } from '../fn/packages/packages-delete-package-for-user';
import { PackagesDeletePackageForUser$Params } from '../fn/packages/packages-delete-package-for-user';
import { packagesDeletePackageVersionForAuthenticatedUser } from '../fn/packages/packages-delete-package-version-for-authenticated-user';
import { PackagesDeletePackageVersionForAuthenticatedUser$Params } from '../fn/packages/packages-delete-package-version-for-authenticated-user';
import { packagesDeletePackageVersionForOrg } from '../fn/packages/packages-delete-package-version-for-org';
import { PackagesDeletePackageVersionForOrg$Params } from '../fn/packages/packages-delete-package-version-for-org';
import { packagesDeletePackageVersionForUser } from '../fn/packages/packages-delete-package-version-for-user';
import { PackagesDeletePackageVersionForUser$Params } from '../fn/packages/packages-delete-package-version-for-user';
import { packagesGetAllPackageVersionsForPackageOwnedByAuthenticatedUser } from '../fn/packages/packages-get-all-package-versions-for-package-owned-by-authenticated-user';
import { PackagesGetAllPackageVersionsForPackageOwnedByAuthenticatedUser$Params } from '../fn/packages/packages-get-all-package-versions-for-package-owned-by-authenticated-user';
import { packagesGetAllPackageVersionsForPackageOwnedByOrg } from '../fn/packages/packages-get-all-package-versions-for-package-owned-by-org';
import { PackagesGetAllPackageVersionsForPackageOwnedByOrg$Params } from '../fn/packages/packages-get-all-package-versions-for-package-owned-by-org';
import { packagesGetAllPackageVersionsForPackageOwnedByUser } from '../fn/packages/packages-get-all-package-versions-for-package-owned-by-user';
import { PackagesGetAllPackageVersionsForPackageOwnedByUser$Params } from '../fn/packages/packages-get-all-package-versions-for-package-owned-by-user';
import { packagesGetPackageForAuthenticatedUser } from '../fn/packages/packages-get-package-for-authenticated-user';
import { PackagesGetPackageForAuthenticatedUser$Params } from '../fn/packages/packages-get-package-for-authenticated-user';
import { packagesGetPackageForOrganization } from '../fn/packages/packages-get-package-for-organization';
import { PackagesGetPackageForOrganization$Params } from '../fn/packages/packages-get-package-for-organization';
import { packagesGetPackageForUser } from '../fn/packages/packages-get-package-for-user';
import { PackagesGetPackageForUser$Params } from '../fn/packages/packages-get-package-for-user';
import { packagesGetPackageVersionForAuthenticatedUser } from '../fn/packages/packages-get-package-version-for-authenticated-user';
import { PackagesGetPackageVersionForAuthenticatedUser$Params } from '../fn/packages/packages-get-package-version-for-authenticated-user';
import { packagesGetPackageVersionForOrganization } from '../fn/packages/packages-get-package-version-for-organization';
import { PackagesGetPackageVersionForOrganization$Params } from '../fn/packages/packages-get-package-version-for-organization';
import { packagesGetPackageVersionForUser } from '../fn/packages/packages-get-package-version-for-user';
import { PackagesGetPackageVersionForUser$Params } from '../fn/packages/packages-get-package-version-for-user';
import { packagesListDockerMigrationConflictingPackagesForAuthenticatedUser } from '../fn/packages/packages-list-docker-migration-conflicting-packages-for-authenticated-user';
import { PackagesListDockerMigrationConflictingPackagesForAuthenticatedUser$Params } from '../fn/packages/packages-list-docker-migration-conflicting-packages-for-authenticated-user';
import { packagesListDockerMigrationConflictingPackagesForOrganization } from '../fn/packages/packages-list-docker-migration-conflicting-packages-for-organization';
import { PackagesListDockerMigrationConflictingPackagesForOrganization$Params } from '../fn/packages/packages-list-docker-migration-conflicting-packages-for-organization';
import { packagesListDockerMigrationConflictingPackagesForUser } from '../fn/packages/packages-list-docker-migration-conflicting-packages-for-user';
import { PackagesListDockerMigrationConflictingPackagesForUser$Params } from '../fn/packages/packages-list-docker-migration-conflicting-packages-for-user';
import { packagesListPackagesForAuthenticatedUser } from '../fn/packages/packages-list-packages-for-authenticated-user';
import { PackagesListPackagesForAuthenticatedUser$Params } from '../fn/packages/packages-list-packages-for-authenticated-user';
import { packagesListPackagesForOrganization } from '../fn/packages/packages-list-packages-for-organization';
import { PackagesListPackagesForOrganization$Params } from '../fn/packages/packages-list-packages-for-organization';
import { packagesListPackagesForUser } from '../fn/packages/packages-list-packages-for-user';
import { PackagesListPackagesForUser$Params } from '../fn/packages/packages-list-packages-for-user';
import { packagesRestorePackageForAuthenticatedUser } from '../fn/packages/packages-restore-package-for-authenticated-user';
import { PackagesRestorePackageForAuthenticatedUser$Params } from '../fn/packages/packages-restore-package-for-authenticated-user';
import { packagesRestorePackageForOrg } from '../fn/packages/packages-restore-package-for-org';
import { PackagesRestorePackageForOrg$Params } from '../fn/packages/packages-restore-package-for-org';
import { packagesRestorePackageForUser } from '../fn/packages/packages-restore-package-for-user';
import { PackagesRestorePackageForUser$Params } from '../fn/packages/packages-restore-package-for-user';
import { packagesRestorePackageVersionForAuthenticatedUser } from '../fn/packages/packages-restore-package-version-for-authenticated-user';
import { PackagesRestorePackageVersionForAuthenticatedUser$Params } from '../fn/packages/packages-restore-package-version-for-authenticated-user';
import { packagesRestorePackageVersionForOrg } from '../fn/packages/packages-restore-package-version-for-org';
import { PackagesRestorePackageVersionForOrg$Params } from '../fn/packages/packages-restore-package-version-for-org';
import { packagesRestorePackageVersionForUser } from '../fn/packages/packages-restore-package-version-for-user';
import { PackagesRestorePackageVersionForUser$Params } from '../fn/packages/packages-restore-package-version-for-user';


/**
 * Manage packages for authenticated users and organizations.
 */
@Injectable({ providedIn: 'root' })
export class PackagesService extends BaseService {
  constructor(config: ApiConfiguration, http: HttpClient) {
    super(config, http);
  }

  /** Path part for operation `packagesListDockerMigrationConflictingPackagesForOrganization()` */
  static readonly PackagesListDockerMigrationConflictingPackagesForOrganizationPath = '/orgs/{org}/docker/conflicts';

  /**
   * Get list of conflicting packages during Docker migration for organization.
   *
   * Lists all packages that are in a specific organization, are readable by the requesting user, and that encountered a conflict during a Docker migration.
   * To use this endpoint, you must authenticate using an access token with the `read:packages` scope.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `packagesListDockerMigrationConflictingPackagesForOrganization()` instead.
   *
   * This method doesn't expect any request body.
   */
  packagesListDockerMigrationConflictingPackagesForOrganization$Response(params: PackagesListDockerMigrationConflictingPackagesForOrganization$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Package>>> {
    return packagesListDockerMigrationConflictingPackagesForOrganization(this.http, this.rootUrl, params, context);
  }

  /**
   * Get list of conflicting packages during Docker migration for organization.
   *
   * Lists all packages that are in a specific organization, are readable by the requesting user, and that encountered a conflict during a Docker migration.
   * To use this endpoint, you must authenticate using an access token with the `read:packages` scope.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `packagesListDockerMigrationConflictingPackagesForOrganization$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  packagesListDockerMigrationConflictingPackagesForOrganization(params: PackagesListDockerMigrationConflictingPackagesForOrganization$Params, context?: HttpContext): Observable<Array<Package>> {
    return this.packagesListDockerMigrationConflictingPackagesForOrganization$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Package>>): Array<Package> => r.body)
    );
  }

  /** Path part for operation `packagesListPackagesForOrganization()` */
  static readonly PackagesListPackagesForOrganizationPath = '/orgs/{org}/packages';

  /**
   * List packages for an organization.
   *
   * Lists packages in an organization readable by the user.
   *
   * To use this endpoint, you must authenticate using an access token with the `read:packages` scope. If the `package_type` belongs to a registry that only supports repository-scoped permissions, your token must also include the `repo` scope. For the list of GitHub Packages registries that only support repository-scoped permissions, see "[About permissions for GitHub Packages](https://docs.github.com/packages/learn-github-packages/about-permissions-for-github-packages#permissions-for-repository-scoped-packages)."
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `packagesListPackagesForOrganization()` instead.
   *
   * This method doesn't expect any request body.
   */
  packagesListPackagesForOrganization$Response(params: PackagesListPackagesForOrganization$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Package>>> {
    return packagesListPackagesForOrganization(this.http, this.rootUrl, params, context);
  }

  /**
   * List packages for an organization.
   *
   * Lists packages in an organization readable by the user.
   *
   * To use this endpoint, you must authenticate using an access token with the `read:packages` scope. If the `package_type` belongs to a registry that only supports repository-scoped permissions, your token must also include the `repo` scope. For the list of GitHub Packages registries that only support repository-scoped permissions, see "[About permissions for GitHub Packages](https://docs.github.com/packages/learn-github-packages/about-permissions-for-github-packages#permissions-for-repository-scoped-packages)."
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `packagesListPackagesForOrganization$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  packagesListPackagesForOrganization(params: PackagesListPackagesForOrganization$Params, context?: HttpContext): Observable<Array<Package>> {
    return this.packagesListPackagesForOrganization$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Package>>): Array<Package> => r.body)
    );
  }

  /** Path part for operation `packagesGetPackageForOrganization()` */
  static readonly PackagesGetPackageForOrganizationPath = '/orgs/{org}/packages/{package_type}/{package_name}';

  /**
   * Get a package for an organization.
   *
   * Gets a specific package in an organization.
   *
   * To use this endpoint, you must authenticate using an access token with the `read:packages` scope. If the `package_type` belongs to a GitHub Packages registry that only supports repository-scoped permissions, your token must also include the `repo` scope. For the list of GitHub Packages registries that only support repository-scoped permissions, see "[About permissions for GitHub Packages](https://docs.github.com/packages/learn-github-packages/about-permissions-for-github-packages#permissions-for-repository-scoped-packages)."
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `packagesGetPackageForOrganization()` instead.
   *
   * This method doesn't expect any request body.
   */
  packagesGetPackageForOrganization$Response(params: PackagesGetPackageForOrganization$Params, context?: HttpContext): Observable<StrictHttpResponse<Package>> {
    return packagesGetPackageForOrganization(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a package for an organization.
   *
   * Gets a specific package in an organization.
   *
   * To use this endpoint, you must authenticate using an access token with the `read:packages` scope. If the `package_type` belongs to a GitHub Packages registry that only supports repository-scoped permissions, your token must also include the `repo` scope. For the list of GitHub Packages registries that only support repository-scoped permissions, see "[About permissions for GitHub Packages](https://docs.github.com/packages/learn-github-packages/about-permissions-for-github-packages#permissions-for-repository-scoped-packages)."
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `packagesGetPackageForOrganization$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  packagesGetPackageForOrganization(params: PackagesGetPackageForOrganization$Params, context?: HttpContext): Observable<Package> {
    return this.packagesGetPackageForOrganization$Response(params, context).pipe(
      map((r: StrictHttpResponse<Package>): Package => r.body)
    );
  }

  /** Path part for operation `packagesDeletePackageForOrg()` */
  static readonly PackagesDeletePackageForOrgPath = '/orgs/{org}/packages/{package_type}/{package_name}';

  /**
   * Delete a package for an organization.
   *
   * Deletes an entire package in an organization. You cannot delete a public package if any version of the package has more than 5,000 downloads. In this scenario, contact GitHub support for further assistance.
   *
   * To use this endpoint, you must have admin permissions in the organization and authenticate using an access token with the `read:packages` and `delete:packages` scopes. In addition:
   * - If the `package_type` belongs to a GitHub Packages registry that only supports repository-scoped permissions, your token must also include the `repo` scope. For the list of these registries, see "[About permissions for GitHub Packages](https://docs.github.com/packages/learn-github-packages/about-permissions-for-github-packages#permissions-for-repository-scoped-packages)."
   * - If the `package_type` belongs to a GitHub Packages registry that supports granular permissions, you must have admin permissions to the package you want to delete. For the list of these registries, see "[About permissions for GitHub Packages](https://docs.github.com/packages/learn-github-packages/about-permissions-for-github-packages#granular-permissions-for-userorganization-scoped-packages)."
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `packagesDeletePackageForOrg()` instead.
   *
   * This method doesn't expect any request body.
   */
  packagesDeletePackageForOrg$Response(params: PackagesDeletePackageForOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return packagesDeletePackageForOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete a package for an organization.
   *
   * Deletes an entire package in an organization. You cannot delete a public package if any version of the package has more than 5,000 downloads. In this scenario, contact GitHub support for further assistance.
   *
   * To use this endpoint, you must have admin permissions in the organization and authenticate using an access token with the `read:packages` and `delete:packages` scopes. In addition:
   * - If the `package_type` belongs to a GitHub Packages registry that only supports repository-scoped permissions, your token must also include the `repo` scope. For the list of these registries, see "[About permissions for GitHub Packages](https://docs.github.com/packages/learn-github-packages/about-permissions-for-github-packages#permissions-for-repository-scoped-packages)."
   * - If the `package_type` belongs to a GitHub Packages registry that supports granular permissions, you must have admin permissions to the package you want to delete. For the list of these registries, see "[About permissions for GitHub Packages](https://docs.github.com/packages/learn-github-packages/about-permissions-for-github-packages#granular-permissions-for-userorganization-scoped-packages)."
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `packagesDeletePackageForOrg$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  packagesDeletePackageForOrg(params: PackagesDeletePackageForOrg$Params, context?: HttpContext): Observable<void> {
    return this.packagesDeletePackageForOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `packagesRestorePackageForOrg()` */
  static readonly PackagesRestorePackageForOrgPath = '/orgs/{org}/packages/{package_type}/{package_name}/restore';

  /**
   * Restore a package for an organization.
   *
   * Restores an entire package in an organization.
   *
   * You can restore a deleted package under the following conditions:
   *   - The package was deleted within the last 30 days.
   *   - The same package namespace and version is still available and not reused for a new package. If the same package namespace is not available, you will not be able to restore your package. In this scenario, to restore the deleted package, you must delete the new package that uses the deleted package's namespace first.
   *
   * To use this endpoint, you must have admin permissions in the organization and authenticate using an access token with the `read:packages` and `write:packages` scopes. In addition:
   * - If the `package_type` belongs to a GitHub Packages registry that only supports repository-scoped permissions, your token must also include the `repo` scope. For the list of these registries, see "[About permissions for GitHub Packages](https://docs.github.com/packages/learn-github-packages/about-permissions-for-github-packages#permissions-for-repository-scoped-packages)."
   * - If the `package_type` belongs to a GitHub Packages registry that supports granular permissions, you must have admin permissions to the package you want to restore. For the list of these registries, see "[About permissions for GitHub Packages](https://docs.github.com/packages/learn-github-packages/about-permissions-for-github-packages#granular-permissions-for-userorganization-scoped-packages)."
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `packagesRestorePackageForOrg()` instead.
   *
   * This method doesn't expect any request body.
   */
  packagesRestorePackageForOrg$Response(params: PackagesRestorePackageForOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return packagesRestorePackageForOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * Restore a package for an organization.
   *
   * Restores an entire package in an organization.
   *
   * You can restore a deleted package under the following conditions:
   *   - The package was deleted within the last 30 days.
   *   - The same package namespace and version is still available and not reused for a new package. If the same package namespace is not available, you will not be able to restore your package. In this scenario, to restore the deleted package, you must delete the new package that uses the deleted package's namespace first.
   *
   * To use this endpoint, you must have admin permissions in the organization and authenticate using an access token with the `read:packages` and `write:packages` scopes. In addition:
   * - If the `package_type` belongs to a GitHub Packages registry that only supports repository-scoped permissions, your token must also include the `repo` scope. For the list of these registries, see "[About permissions for GitHub Packages](https://docs.github.com/packages/learn-github-packages/about-permissions-for-github-packages#permissions-for-repository-scoped-packages)."
   * - If the `package_type` belongs to a GitHub Packages registry that supports granular permissions, you must have admin permissions to the package you want to restore. For the list of these registries, see "[About permissions for GitHub Packages](https://docs.github.com/packages/learn-github-packages/about-permissions-for-github-packages#granular-permissions-for-userorganization-scoped-packages)."
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `packagesRestorePackageForOrg$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  packagesRestorePackageForOrg(params: PackagesRestorePackageForOrg$Params, context?: HttpContext): Observable<void> {
    return this.packagesRestorePackageForOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `packagesGetAllPackageVersionsForPackageOwnedByOrg()` */
  static readonly PackagesGetAllPackageVersionsForPackageOwnedByOrgPath = '/orgs/{org}/packages/{package_type}/{package_name}/versions';

  /**
   * List package versions for a package owned by an organization.
   *
   * Lists package versions for a package owned by an organization.
   *
   * If the `package_type` belongs to a GitHub Packages registry that only supports repository-scoped permissions, your token must also include the `repo` scope. For the list of GitHub Packages registries that only support repository-scoped permissions, see "[About permissions for GitHub Packages](https://docs.github.com/packages/learn-github-packages/about-permissions-for-github-packages#permissions-for-repository-scoped-packages)."
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `packagesGetAllPackageVersionsForPackageOwnedByOrg()` instead.
   *
   * This method doesn't expect any request body.
   */
  packagesGetAllPackageVersionsForPackageOwnedByOrg$Response(params: PackagesGetAllPackageVersionsForPackageOwnedByOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<PackageVersion>>> {
    return packagesGetAllPackageVersionsForPackageOwnedByOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * List package versions for a package owned by an organization.
   *
   * Lists package versions for a package owned by an organization.
   *
   * If the `package_type` belongs to a GitHub Packages registry that only supports repository-scoped permissions, your token must also include the `repo` scope. For the list of GitHub Packages registries that only support repository-scoped permissions, see "[About permissions for GitHub Packages](https://docs.github.com/packages/learn-github-packages/about-permissions-for-github-packages#permissions-for-repository-scoped-packages)."
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `packagesGetAllPackageVersionsForPackageOwnedByOrg$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  packagesGetAllPackageVersionsForPackageOwnedByOrg(params: PackagesGetAllPackageVersionsForPackageOwnedByOrg$Params, context?: HttpContext): Observable<Array<PackageVersion>> {
    return this.packagesGetAllPackageVersionsForPackageOwnedByOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<PackageVersion>>): Array<PackageVersion> => r.body)
    );
  }

  /** Path part for operation `packagesGetPackageVersionForOrganization()` */
  static readonly PackagesGetPackageVersionForOrganizationPath = '/orgs/{org}/packages/{package_type}/{package_name}/versions/{package_version_id}';

  /**
   * Get a package version for an organization.
   *
   * Gets a specific package version in an organization.
   *
   * You must authenticate using an access token with the `read:packages` scope. If the `package_type` belongs to a GitHub Packages registry that only supports repository-scoped permissions, your token must also include the `repo` scope. For the list of GitHub Packages registries that only support repository-scoped permissions, see "[About permissions for GitHub Packages](https://docs.github.com/packages/learn-github-packages/about-permissions-for-github-packages#permissions-for-repository-scoped-packages)."
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `packagesGetPackageVersionForOrganization()` instead.
   *
   * This method doesn't expect any request body.
   */
  packagesGetPackageVersionForOrganization$Response(params: PackagesGetPackageVersionForOrganization$Params, context?: HttpContext): Observable<StrictHttpResponse<PackageVersion>> {
    return packagesGetPackageVersionForOrganization(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a package version for an organization.
   *
   * Gets a specific package version in an organization.
   *
   * You must authenticate using an access token with the `read:packages` scope. If the `package_type` belongs to a GitHub Packages registry that only supports repository-scoped permissions, your token must also include the `repo` scope. For the list of GitHub Packages registries that only support repository-scoped permissions, see "[About permissions for GitHub Packages](https://docs.github.com/packages/learn-github-packages/about-permissions-for-github-packages#permissions-for-repository-scoped-packages)."
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `packagesGetPackageVersionForOrganization$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  packagesGetPackageVersionForOrganization(params: PackagesGetPackageVersionForOrganization$Params, context?: HttpContext): Observable<PackageVersion> {
    return this.packagesGetPackageVersionForOrganization$Response(params, context).pipe(
      map((r: StrictHttpResponse<PackageVersion>): PackageVersion => r.body)
    );
  }

  /** Path part for operation `packagesDeletePackageVersionForOrg()` */
  static readonly PackagesDeletePackageVersionForOrgPath = '/orgs/{org}/packages/{package_type}/{package_name}/versions/{package_version_id}';

  /**
   * Delete package version for an organization.
   *
   * Deletes a specific package version in an organization. If the package is public and the package version has more than 5,000 downloads, you cannot delete the package version. In this scenario, contact GitHub support for further assistance.
   *
   * To use this endpoint, you must have admin permissions in the organization and authenticate using an access token with the `read:packages` and `delete:packages` scopes. In addition:
   * - If the `package_type` belongs to a GitHub Packages registry that only supports repository-scoped permissions, your token must also include the `repo` scope. For the list of these registries, see "[About permissions for GitHub Packages](https://docs.github.com/packages/learn-github-packages/about-permissions-for-github-packages#permissions-for-repository-scoped-packages)."
   * - If the `package_type` belongs to a GitHub Packages registry that supports granular permissions, you must have admin permissions to the package whose version you want to delete. For the list of these registries, see "[About permissions for GitHub Packages](https://docs.github.com/packages/learn-github-packages/about-permissions-for-github-packages#granular-permissions-for-userorganization-scoped-packages)."
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `packagesDeletePackageVersionForOrg()` instead.
   *
   * This method doesn't expect any request body.
   */
  packagesDeletePackageVersionForOrg$Response(params: PackagesDeletePackageVersionForOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return packagesDeletePackageVersionForOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete package version for an organization.
   *
   * Deletes a specific package version in an organization. If the package is public and the package version has more than 5,000 downloads, you cannot delete the package version. In this scenario, contact GitHub support for further assistance.
   *
   * To use this endpoint, you must have admin permissions in the organization and authenticate using an access token with the `read:packages` and `delete:packages` scopes. In addition:
   * - If the `package_type` belongs to a GitHub Packages registry that only supports repository-scoped permissions, your token must also include the `repo` scope. For the list of these registries, see "[About permissions for GitHub Packages](https://docs.github.com/packages/learn-github-packages/about-permissions-for-github-packages#permissions-for-repository-scoped-packages)."
   * - If the `package_type` belongs to a GitHub Packages registry that supports granular permissions, you must have admin permissions to the package whose version you want to delete. For the list of these registries, see "[About permissions for GitHub Packages](https://docs.github.com/packages/learn-github-packages/about-permissions-for-github-packages#granular-permissions-for-userorganization-scoped-packages)."
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `packagesDeletePackageVersionForOrg$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  packagesDeletePackageVersionForOrg(params: PackagesDeletePackageVersionForOrg$Params, context?: HttpContext): Observable<void> {
    return this.packagesDeletePackageVersionForOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `packagesRestorePackageVersionForOrg()` */
  static readonly PackagesRestorePackageVersionForOrgPath = '/orgs/{org}/packages/{package_type}/{package_name}/versions/{package_version_id}/restore';

  /**
   * Restore package version for an organization.
   *
   * Restores a specific package version in an organization.
   *
   * You can restore a deleted package under the following conditions:
   *   - The package was deleted within the last 30 days.
   *   - The same package namespace and version is still available and not reused for a new package. If the same package namespace is not available, you will not be able to restore your package. In this scenario, to restore the deleted package, you must delete the new package that uses the deleted package's namespace first.
   *
   * To use this endpoint, you must have admin permissions in the organization and authenticate using an access token with the `read:packages` and `write:packages` scopes. In addition:
   * - If the `package_type` belongs to a GitHub Packages registry that only supports repository-scoped permissions, your token must also include the `repo` scope. For the list of these registries, see "[About permissions for GitHub Packages](https://docs.github.com/packages/learn-github-packages/about-permissions-for-github-packages#permissions-for-repository-scoped-packages)."
   * - If the `package_type` belongs to a GitHub Packages registry that supports granular permissions, you must have admin permissions to the package whose version you want to restore. For the list of these registries, see "[About permissions for GitHub Packages](https://docs.github.com/packages/learn-github-packages/about-permissions-for-github-packages#granular-permissions-for-userorganization-scoped-packages)."
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `packagesRestorePackageVersionForOrg()` instead.
   *
   * This method doesn't expect any request body.
   */
  packagesRestorePackageVersionForOrg$Response(params: PackagesRestorePackageVersionForOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return packagesRestorePackageVersionForOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * Restore package version for an organization.
   *
   * Restores a specific package version in an organization.
   *
   * You can restore a deleted package under the following conditions:
   *   - The package was deleted within the last 30 days.
   *   - The same package namespace and version is still available and not reused for a new package. If the same package namespace is not available, you will not be able to restore your package. In this scenario, to restore the deleted package, you must delete the new package that uses the deleted package's namespace first.
   *
   * To use this endpoint, you must have admin permissions in the organization and authenticate using an access token with the `read:packages` and `write:packages` scopes. In addition:
   * - If the `package_type` belongs to a GitHub Packages registry that only supports repository-scoped permissions, your token must also include the `repo` scope. For the list of these registries, see "[About permissions for GitHub Packages](https://docs.github.com/packages/learn-github-packages/about-permissions-for-github-packages#permissions-for-repository-scoped-packages)."
   * - If the `package_type` belongs to a GitHub Packages registry that supports granular permissions, you must have admin permissions to the package whose version you want to restore. For the list of these registries, see "[About permissions for GitHub Packages](https://docs.github.com/packages/learn-github-packages/about-permissions-for-github-packages#granular-permissions-for-userorganization-scoped-packages)."
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `packagesRestorePackageVersionForOrg$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  packagesRestorePackageVersionForOrg(params: PackagesRestorePackageVersionForOrg$Params, context?: HttpContext): Observable<void> {
    return this.packagesRestorePackageVersionForOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `packagesListDockerMigrationConflictingPackagesForAuthenticatedUser()` */
  static readonly PackagesListDockerMigrationConflictingPackagesForAuthenticatedUserPath = '/user/docker/conflicts';

  /**
   * Get list of conflicting packages during Docker migration for authenticated-user.
   *
   * Lists all packages that are owned by the authenticated user within the user's namespace, and that encountered a conflict during a Docker migration.
   * To use this endpoint, you must authenticate using an access token with the `read:packages` scope.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `packagesListDockerMigrationConflictingPackagesForAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  packagesListDockerMigrationConflictingPackagesForAuthenticatedUser$Response(params?: PackagesListDockerMigrationConflictingPackagesForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Package>>> {
    return packagesListDockerMigrationConflictingPackagesForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Get list of conflicting packages during Docker migration for authenticated-user.
   *
   * Lists all packages that are owned by the authenticated user within the user's namespace, and that encountered a conflict during a Docker migration.
   * To use this endpoint, you must authenticate using an access token with the `read:packages` scope.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `packagesListDockerMigrationConflictingPackagesForAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  packagesListDockerMigrationConflictingPackagesForAuthenticatedUser(params?: PackagesListDockerMigrationConflictingPackagesForAuthenticatedUser$Params, context?: HttpContext): Observable<Array<Package>> {
    return this.packagesListDockerMigrationConflictingPackagesForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Package>>): Array<Package> => r.body)
    );
  }

  /** Path part for operation `packagesListPackagesForAuthenticatedUser()` */
  static readonly PackagesListPackagesForAuthenticatedUserPath = '/user/packages';

  /**
   * List packages for the authenticated user's namespace.
   *
   * Lists packages owned by the authenticated user within the user's namespace.
   *
   * To use this endpoint, you must authenticate using an access token with the `read:packages` scope. If the `package_type` belongs to a GitHub Packages registry that only supports repository-scoped permissions, your token must also include the `repo` scope. For the list of GitHub Packages registries that only support repository-scoped permissions, see "[About permissions for GitHub Packages](https://docs.github.com/packages/learn-github-packages/about-permissions-for-github-packages#permissions-for-repository-scoped-packages)."
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `packagesListPackagesForAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  packagesListPackagesForAuthenticatedUser$Response(params: PackagesListPackagesForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Package>>> {
    return packagesListPackagesForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * List packages for the authenticated user's namespace.
   *
   * Lists packages owned by the authenticated user within the user's namespace.
   *
   * To use this endpoint, you must authenticate using an access token with the `read:packages` scope. If the `package_type` belongs to a GitHub Packages registry that only supports repository-scoped permissions, your token must also include the `repo` scope. For the list of GitHub Packages registries that only support repository-scoped permissions, see "[About permissions for GitHub Packages](https://docs.github.com/packages/learn-github-packages/about-permissions-for-github-packages#permissions-for-repository-scoped-packages)."
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `packagesListPackagesForAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  packagesListPackagesForAuthenticatedUser(params: PackagesListPackagesForAuthenticatedUser$Params, context?: HttpContext): Observable<Array<Package>> {
    return this.packagesListPackagesForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Package>>): Array<Package> => r.body)
    );
  }

  /** Path part for operation `packagesGetPackageForAuthenticatedUser()` */
  static readonly PackagesGetPackageForAuthenticatedUserPath = '/user/packages/{package_type}/{package_name}';

  /**
   * Get a package for the authenticated user.
   *
   * Gets a specific package for a package owned by the authenticated user.
   *
   * To use this endpoint, you must authenticate using an access token with the `read:packages` scope. If the `package_type` belongs to a GitHub Packages registry that only supports repository-scoped permissions, your token must also include the `repo` scope. For the list of GitHub Packages registries that only support repository-scoped permissions, see "[About permissions for GitHub Packages](https://docs.github.com/packages/learn-github-packages/about-permissions-for-github-packages#permissions-for-repository-scoped-packages)."
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `packagesGetPackageForAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  packagesGetPackageForAuthenticatedUser$Response(params: PackagesGetPackageForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Package>> {
    return packagesGetPackageForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a package for the authenticated user.
   *
   * Gets a specific package for a package owned by the authenticated user.
   *
   * To use this endpoint, you must authenticate using an access token with the `read:packages` scope. If the `package_type` belongs to a GitHub Packages registry that only supports repository-scoped permissions, your token must also include the `repo` scope. For the list of GitHub Packages registries that only support repository-scoped permissions, see "[About permissions for GitHub Packages](https://docs.github.com/packages/learn-github-packages/about-permissions-for-github-packages#permissions-for-repository-scoped-packages)."
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `packagesGetPackageForAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  packagesGetPackageForAuthenticatedUser(params: PackagesGetPackageForAuthenticatedUser$Params, context?: HttpContext): Observable<Package> {
    return this.packagesGetPackageForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<Package>): Package => r.body)
    );
  }

  /** Path part for operation `packagesDeletePackageForAuthenticatedUser()` */
  static readonly PackagesDeletePackageForAuthenticatedUserPath = '/user/packages/{package_type}/{package_name}';

  /**
   * Delete a package for the authenticated user.
   *
   * Deletes a package owned by the authenticated user. You cannot delete a public package if any version of the package has more than 5,000 downloads. In this scenario, contact GitHub support for further assistance.
   *
   * To use this endpoint, you must authenticate using an access token with the `read:packages` and `delete:packages` scopes.
   * If the `package_type` belongs to a GitHub Packages registry that only supports repository-scoped permissions, your token must also include the `repo` scope. For the list of GitHub Packages registries that only support repository-scoped permissions, see "[About permissions for GitHub Packages](https://docs.github.com/packages/learn-github-packages/about-permissions-for-github-packages#permissions-for-repository-scoped-packages)."
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `packagesDeletePackageForAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  packagesDeletePackageForAuthenticatedUser$Response(params: PackagesDeletePackageForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return packagesDeletePackageForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete a package for the authenticated user.
   *
   * Deletes a package owned by the authenticated user. You cannot delete a public package if any version of the package has more than 5,000 downloads. In this scenario, contact GitHub support for further assistance.
   *
   * To use this endpoint, you must authenticate using an access token with the `read:packages` and `delete:packages` scopes.
   * If the `package_type` belongs to a GitHub Packages registry that only supports repository-scoped permissions, your token must also include the `repo` scope. For the list of GitHub Packages registries that only support repository-scoped permissions, see "[About permissions for GitHub Packages](https://docs.github.com/packages/learn-github-packages/about-permissions-for-github-packages#permissions-for-repository-scoped-packages)."
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `packagesDeletePackageForAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  packagesDeletePackageForAuthenticatedUser(params: PackagesDeletePackageForAuthenticatedUser$Params, context?: HttpContext): Observable<void> {
    return this.packagesDeletePackageForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `packagesRestorePackageForAuthenticatedUser()` */
  static readonly PackagesRestorePackageForAuthenticatedUserPath = '/user/packages/{package_type}/{package_name}/restore';

  /**
   * Restore a package for the authenticated user.
   *
   * Restores a package owned by the authenticated user.
   *
   * You can restore a deleted package under the following conditions:
   *   - The package was deleted within the last 30 days.
   *   - The same package namespace and version is still available and not reused for a new package. If the same package namespace is not available, you will not be able to restore your package. In this scenario, to restore the deleted package, you must delete the new package that uses the deleted package's namespace first.
   *
   * To use this endpoint, you must authenticate using an access token with the `read:packages` and `write:packages` scopes. If the `package_type` belongs to a GitHub Packages registry that only supports repository-scoped permissions, your token must also include the `repo` scope. For the list of GitHub Packages registries that only support repository-scoped permissions, see "[About permissions for GitHub Packages](https://docs.github.com/packages/learn-github-packages/about-permissions-for-github-packages#permissions-for-repository-scoped-packages)."
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `packagesRestorePackageForAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  packagesRestorePackageForAuthenticatedUser$Response(params: PackagesRestorePackageForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return packagesRestorePackageForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Restore a package for the authenticated user.
   *
   * Restores a package owned by the authenticated user.
   *
   * You can restore a deleted package under the following conditions:
   *   - The package was deleted within the last 30 days.
   *   - The same package namespace and version is still available and not reused for a new package. If the same package namespace is not available, you will not be able to restore your package. In this scenario, to restore the deleted package, you must delete the new package that uses the deleted package's namespace first.
   *
   * To use this endpoint, you must authenticate using an access token with the `read:packages` and `write:packages` scopes. If the `package_type` belongs to a GitHub Packages registry that only supports repository-scoped permissions, your token must also include the `repo` scope. For the list of GitHub Packages registries that only support repository-scoped permissions, see "[About permissions for GitHub Packages](https://docs.github.com/packages/learn-github-packages/about-permissions-for-github-packages#permissions-for-repository-scoped-packages)."
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `packagesRestorePackageForAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  packagesRestorePackageForAuthenticatedUser(params: PackagesRestorePackageForAuthenticatedUser$Params, context?: HttpContext): Observable<void> {
    return this.packagesRestorePackageForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `packagesGetAllPackageVersionsForPackageOwnedByAuthenticatedUser()` */
  static readonly PackagesGetAllPackageVersionsForPackageOwnedByAuthenticatedUserPath = '/user/packages/{package_type}/{package_name}/versions';

  /**
   * List package versions for a package owned by the authenticated user.
   *
   * Lists package versions for a package owned by the authenticated user.
   *
   * To use this endpoint, you must authenticate using an access token with the `read:packages` scope. If the `package_type` belongs to a GitHub Packages registry that only supports repository-scoped permissions, your token must also include the `repo` scope. For the list of GitHub Packages registries that only support repository-scoped permissions, see "[About permissions for GitHub Packages](https://docs.github.com/packages/learn-github-packages/about-permissions-for-github-packages#permissions-for-repository-scoped-packages)."
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `packagesGetAllPackageVersionsForPackageOwnedByAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  packagesGetAllPackageVersionsForPackageOwnedByAuthenticatedUser$Response(params: PackagesGetAllPackageVersionsForPackageOwnedByAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<PackageVersion>>> {
    return packagesGetAllPackageVersionsForPackageOwnedByAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * List package versions for a package owned by the authenticated user.
   *
   * Lists package versions for a package owned by the authenticated user.
   *
   * To use this endpoint, you must authenticate using an access token with the `read:packages` scope. If the `package_type` belongs to a GitHub Packages registry that only supports repository-scoped permissions, your token must also include the `repo` scope. For the list of GitHub Packages registries that only support repository-scoped permissions, see "[About permissions for GitHub Packages](https://docs.github.com/packages/learn-github-packages/about-permissions-for-github-packages#permissions-for-repository-scoped-packages)."
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `packagesGetAllPackageVersionsForPackageOwnedByAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  packagesGetAllPackageVersionsForPackageOwnedByAuthenticatedUser(params: PackagesGetAllPackageVersionsForPackageOwnedByAuthenticatedUser$Params, context?: HttpContext): Observable<Array<PackageVersion>> {
    return this.packagesGetAllPackageVersionsForPackageOwnedByAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<PackageVersion>>): Array<PackageVersion> => r.body)
    );
  }

  /** Path part for operation `packagesGetPackageVersionForAuthenticatedUser()` */
  static readonly PackagesGetPackageVersionForAuthenticatedUserPath = '/user/packages/{package_type}/{package_name}/versions/{package_version_id}';

  /**
   * Get a package version for the authenticated user.
   *
   * Gets a specific package version for a package owned by the authenticated user.
   *
   * To use this endpoint, you must authenticate using an access token with the `read:packages` scope. If the `package_type` belongs to a GitHub Packages registry that only supports repository-scoped permissions, your token must also include the `repo` scope. For the list of GitHub Packages registries that only support repository-scoped permissions, see "[About permissions for GitHub Packages](https://docs.github.com/packages/learn-github-packages/about-permissions-for-github-packages#permissions-for-repository-scoped-packages)."
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `packagesGetPackageVersionForAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  packagesGetPackageVersionForAuthenticatedUser$Response(params: PackagesGetPackageVersionForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<PackageVersion>> {
    return packagesGetPackageVersionForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a package version for the authenticated user.
   *
   * Gets a specific package version for a package owned by the authenticated user.
   *
   * To use this endpoint, you must authenticate using an access token with the `read:packages` scope. If the `package_type` belongs to a GitHub Packages registry that only supports repository-scoped permissions, your token must also include the `repo` scope. For the list of GitHub Packages registries that only support repository-scoped permissions, see "[About permissions for GitHub Packages](https://docs.github.com/packages/learn-github-packages/about-permissions-for-github-packages#permissions-for-repository-scoped-packages)."
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `packagesGetPackageVersionForAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  packagesGetPackageVersionForAuthenticatedUser(params: PackagesGetPackageVersionForAuthenticatedUser$Params, context?: HttpContext): Observable<PackageVersion> {
    return this.packagesGetPackageVersionForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<PackageVersion>): PackageVersion => r.body)
    );
  }

  /** Path part for operation `packagesDeletePackageVersionForAuthenticatedUser()` */
  static readonly PackagesDeletePackageVersionForAuthenticatedUserPath = '/user/packages/{package_type}/{package_name}/versions/{package_version_id}';

  /**
   * Delete a package version for the authenticated user.
   *
   * Deletes a specific package version for a package owned by the authenticated user.  If the package is public and the package version has more than 5,000 downloads, you cannot delete the package version. In this scenario, contact GitHub support for further assistance.
   *
   * To use this endpoint, you must have admin permissions in the organization and authenticate using an access token with the `read:packages` and `delete:packages` scopes.
   * If the `package_type` belongs to a GitHub Packages registry that only supports repository-scoped permissions, your token must also include the `repo` scope. For the list of GitHub Packages registries that only support repository-scoped permissions, see "[About permissions for GitHub Packages](https://docs.github.com/packages/learn-github-packages/about-permissions-for-github-packages#permissions-for-repository-scoped-packages)."
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `packagesDeletePackageVersionForAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  packagesDeletePackageVersionForAuthenticatedUser$Response(params: PackagesDeletePackageVersionForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return packagesDeletePackageVersionForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete a package version for the authenticated user.
   *
   * Deletes a specific package version for a package owned by the authenticated user.  If the package is public and the package version has more than 5,000 downloads, you cannot delete the package version. In this scenario, contact GitHub support for further assistance.
   *
   * To use this endpoint, you must have admin permissions in the organization and authenticate using an access token with the `read:packages` and `delete:packages` scopes.
   * If the `package_type` belongs to a GitHub Packages registry that only supports repository-scoped permissions, your token must also include the `repo` scope. For the list of GitHub Packages registries that only support repository-scoped permissions, see "[About permissions for GitHub Packages](https://docs.github.com/packages/learn-github-packages/about-permissions-for-github-packages#permissions-for-repository-scoped-packages)."
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `packagesDeletePackageVersionForAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  packagesDeletePackageVersionForAuthenticatedUser(params: PackagesDeletePackageVersionForAuthenticatedUser$Params, context?: HttpContext): Observable<void> {
    return this.packagesDeletePackageVersionForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `packagesRestorePackageVersionForAuthenticatedUser()` */
  static readonly PackagesRestorePackageVersionForAuthenticatedUserPath = '/user/packages/{package_type}/{package_name}/versions/{package_version_id}/restore';

  /**
   * Restore a package version for the authenticated user.
   *
   * Restores a package version owned by the authenticated user.
   *
   * You can restore a deleted package version under the following conditions:
   *   - The package was deleted within the last 30 days.
   *   - The same package namespace and version is still available and not reused for a new package. If the same package namespace is not available, you will not be able to restore your package. In this scenario, to restore the deleted package, you must delete the new package that uses the deleted package's namespace first.
   *
   * To use this endpoint, you must authenticate using an access token with the `read:packages` and `write:packages` scopes. If the `package_type` belongs to a GitHub Packages registry that only supports repository-scoped permissions, your token must also include the `repo` scope. For the list of GitHub Packages registries that only support repository-scoped permissions, see "[About permissions for GitHub Packages](https://docs.github.com/packages/learn-github-packages/about-permissions-for-github-packages#permissions-for-repository-scoped-packages)."
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `packagesRestorePackageVersionForAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  packagesRestorePackageVersionForAuthenticatedUser$Response(params: PackagesRestorePackageVersionForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return packagesRestorePackageVersionForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Restore a package version for the authenticated user.
   *
   * Restores a package version owned by the authenticated user.
   *
   * You can restore a deleted package version under the following conditions:
   *   - The package was deleted within the last 30 days.
   *   - The same package namespace and version is still available and not reused for a new package. If the same package namespace is not available, you will not be able to restore your package. In this scenario, to restore the deleted package, you must delete the new package that uses the deleted package's namespace first.
   *
   * To use this endpoint, you must authenticate using an access token with the `read:packages` and `write:packages` scopes. If the `package_type` belongs to a GitHub Packages registry that only supports repository-scoped permissions, your token must also include the `repo` scope. For the list of GitHub Packages registries that only support repository-scoped permissions, see "[About permissions for GitHub Packages](https://docs.github.com/packages/learn-github-packages/about-permissions-for-github-packages#permissions-for-repository-scoped-packages)."
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `packagesRestorePackageVersionForAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  packagesRestorePackageVersionForAuthenticatedUser(params: PackagesRestorePackageVersionForAuthenticatedUser$Params, context?: HttpContext): Observable<void> {
    return this.packagesRestorePackageVersionForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `packagesListDockerMigrationConflictingPackagesForUser()` */
  static readonly PackagesListDockerMigrationConflictingPackagesForUserPath = '/users/{username}/docker/conflicts';

  /**
   * Get list of conflicting packages during Docker migration for user.
   *
   * Lists all packages that are in a specific user's namespace, that the requesting user has access to, and that encountered a conflict during Docker migration.
   * To use this endpoint, you must authenticate using an access token with the `read:packages` scope.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `packagesListDockerMigrationConflictingPackagesForUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  packagesListDockerMigrationConflictingPackagesForUser$Response(params: PackagesListDockerMigrationConflictingPackagesForUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Package>>> {
    return packagesListDockerMigrationConflictingPackagesForUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Get list of conflicting packages during Docker migration for user.
   *
   * Lists all packages that are in a specific user's namespace, that the requesting user has access to, and that encountered a conflict during Docker migration.
   * To use this endpoint, you must authenticate using an access token with the `read:packages` scope.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `packagesListDockerMigrationConflictingPackagesForUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  packagesListDockerMigrationConflictingPackagesForUser(params: PackagesListDockerMigrationConflictingPackagesForUser$Params, context?: HttpContext): Observable<Array<Package>> {
    return this.packagesListDockerMigrationConflictingPackagesForUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Package>>): Array<Package> => r.body)
    );
  }

  /** Path part for operation `packagesListPackagesForUser()` */
  static readonly PackagesListPackagesForUserPath = '/users/{username}/packages';

  /**
   * List packages for a user.
   *
   * Lists all packages in a user's namespace for which the requesting user has access.
   *
   * To use this endpoint, you must authenticate using an access token with the `read:packages` scope. If the `package_type` belongs to a GitHub Packages registry that only supports repository-scoped permissions, your token must also include the `repo` scope. For the list of GitHub Packages registries that only support repository-scoped permissions, see "[About permissions for GitHub Packages](https://docs.github.com/packages/learn-github-packages/about-permissions-for-github-packages#permissions-for-repository-scoped-packages)."
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `packagesListPackagesForUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  packagesListPackagesForUser$Response(params: PackagesListPackagesForUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Package>>> {
    return packagesListPackagesForUser(this.http, this.rootUrl, params, context);
  }

  /**
   * List packages for a user.
   *
   * Lists all packages in a user's namespace for which the requesting user has access.
   *
   * To use this endpoint, you must authenticate using an access token with the `read:packages` scope. If the `package_type` belongs to a GitHub Packages registry that only supports repository-scoped permissions, your token must also include the `repo` scope. For the list of GitHub Packages registries that only support repository-scoped permissions, see "[About permissions for GitHub Packages](https://docs.github.com/packages/learn-github-packages/about-permissions-for-github-packages#permissions-for-repository-scoped-packages)."
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `packagesListPackagesForUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  packagesListPackagesForUser(params: PackagesListPackagesForUser$Params, context?: HttpContext): Observable<Array<Package>> {
    return this.packagesListPackagesForUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Package>>): Array<Package> => r.body)
    );
  }

  /** Path part for operation `packagesGetPackageForUser()` */
  static readonly PackagesGetPackageForUserPath = '/users/{username}/packages/{package_type}/{package_name}';

  /**
   * Get a package for a user.
   *
   * Gets a specific package metadata for a public package owned by a user.
   *
   * To use this endpoint, you must authenticate using an access token with the `read:packages` scope. If the `package_type` belongs to a GitHub Packages registry that only supports repository-scoped permissions, your token must also include the `repo` scope. For the list of GitHub Packages registries that only support repository-scoped permissions, see "[About permissions for GitHub Packages](https://docs.github.com/packages/learn-github-packages/about-permissions-for-github-packages#permissions-for-repository-scoped-packages)."
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `packagesGetPackageForUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  packagesGetPackageForUser$Response(params: PackagesGetPackageForUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Package>> {
    return packagesGetPackageForUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a package for a user.
   *
   * Gets a specific package metadata for a public package owned by a user.
   *
   * To use this endpoint, you must authenticate using an access token with the `read:packages` scope. If the `package_type` belongs to a GitHub Packages registry that only supports repository-scoped permissions, your token must also include the `repo` scope. For the list of GitHub Packages registries that only support repository-scoped permissions, see "[About permissions for GitHub Packages](https://docs.github.com/packages/learn-github-packages/about-permissions-for-github-packages#permissions-for-repository-scoped-packages)."
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `packagesGetPackageForUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  packagesGetPackageForUser(params: PackagesGetPackageForUser$Params, context?: HttpContext): Observable<Package> {
    return this.packagesGetPackageForUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<Package>): Package => r.body)
    );
  }

  /** Path part for operation `packagesDeletePackageForUser()` */
  static readonly PackagesDeletePackageForUserPath = '/users/{username}/packages/{package_type}/{package_name}';

  /**
   * Delete a package for a user.
   *
   * Deletes an entire package for a user. You cannot delete a public package if any version of the package has more than 5,000 downloads. In this scenario, contact GitHub support for further assistance.
   *
   * To use this endpoint, you must authenticate using an access token with the `read:packages` and `delete:packages` scopes. In addition:
   * - If the `package_type` belongs to a GitHub Packages registry that only supports repository-scoped permissions, your token must also include the `repo` scope. For the list of these registries, see "[About permissions for GitHub Packages](https://docs.github.com/packages/learn-github-packages/about-permissions-for-github-packages#permissions-for-repository-scoped-packages)."
   * - If the `package_type` belongs to a GitHub Packages registry that supports granular permissions, you must have admin permissions to the package you want to delete. For the list of these registries, see "[About permissions for GitHub Packages](https://docs.github.com/packages/learn-github-packages/about-permissions-for-github-packages#granular-permissions-for-userorganization-scoped-packages)."
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `packagesDeletePackageForUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  packagesDeletePackageForUser$Response(params: PackagesDeletePackageForUser$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return packagesDeletePackageForUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete a package for a user.
   *
   * Deletes an entire package for a user. You cannot delete a public package if any version of the package has more than 5,000 downloads. In this scenario, contact GitHub support for further assistance.
   *
   * To use this endpoint, you must authenticate using an access token with the `read:packages` and `delete:packages` scopes. In addition:
   * - If the `package_type` belongs to a GitHub Packages registry that only supports repository-scoped permissions, your token must also include the `repo` scope. For the list of these registries, see "[About permissions for GitHub Packages](https://docs.github.com/packages/learn-github-packages/about-permissions-for-github-packages#permissions-for-repository-scoped-packages)."
   * - If the `package_type` belongs to a GitHub Packages registry that supports granular permissions, you must have admin permissions to the package you want to delete. For the list of these registries, see "[About permissions for GitHub Packages](https://docs.github.com/packages/learn-github-packages/about-permissions-for-github-packages#granular-permissions-for-userorganization-scoped-packages)."
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `packagesDeletePackageForUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  packagesDeletePackageForUser(params: PackagesDeletePackageForUser$Params, context?: HttpContext): Observable<void> {
    return this.packagesDeletePackageForUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `packagesRestorePackageForUser()` */
  static readonly PackagesRestorePackageForUserPath = '/users/{username}/packages/{package_type}/{package_name}/restore';

  /**
   * Restore a package for a user.
   *
   * Restores an entire package for a user.
   *
   * You can restore a deleted package under the following conditions:
   *   - The package was deleted within the last 30 days.
   *   - The same package namespace and version is still available and not reused for a new package. If the same package namespace is not available, you will not be able to restore your package. In this scenario, to restore the deleted package, you must delete the new package that uses the deleted package's namespace first.
   *
   * To use this endpoint, you must authenticate using an access token with the `read:packages` and `write:packages` scopes. In addition:
   * - If the `package_type` belongs to a GitHub Packages registry that only supports repository-scoped permissions, your token must also include the `repo` scope. For the list of these registries, see "[About permissions for GitHub Packages](https://docs.github.com/packages/learn-github-packages/about-permissions-for-github-packages#permissions-for-repository-scoped-packages)."
   * - If the `package_type` belongs to a GitHub Packages registry that supports granular permissions, you must have admin permissions to the package you want to restore. For the list of these registries, see "[About permissions for GitHub Packages](https://docs.github.com/packages/learn-github-packages/about-permissions-for-github-packages#granular-permissions-for-userorganization-scoped-packages)."
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `packagesRestorePackageForUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  packagesRestorePackageForUser$Response(params: PackagesRestorePackageForUser$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return packagesRestorePackageForUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Restore a package for a user.
   *
   * Restores an entire package for a user.
   *
   * You can restore a deleted package under the following conditions:
   *   - The package was deleted within the last 30 days.
   *   - The same package namespace and version is still available and not reused for a new package. If the same package namespace is not available, you will not be able to restore your package. In this scenario, to restore the deleted package, you must delete the new package that uses the deleted package's namespace first.
   *
   * To use this endpoint, you must authenticate using an access token with the `read:packages` and `write:packages` scopes. In addition:
   * - If the `package_type` belongs to a GitHub Packages registry that only supports repository-scoped permissions, your token must also include the `repo` scope. For the list of these registries, see "[About permissions for GitHub Packages](https://docs.github.com/packages/learn-github-packages/about-permissions-for-github-packages#permissions-for-repository-scoped-packages)."
   * - If the `package_type` belongs to a GitHub Packages registry that supports granular permissions, you must have admin permissions to the package you want to restore. For the list of these registries, see "[About permissions for GitHub Packages](https://docs.github.com/packages/learn-github-packages/about-permissions-for-github-packages#granular-permissions-for-userorganization-scoped-packages)."
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `packagesRestorePackageForUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  packagesRestorePackageForUser(params: PackagesRestorePackageForUser$Params, context?: HttpContext): Observable<void> {
    return this.packagesRestorePackageForUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `packagesGetAllPackageVersionsForPackageOwnedByUser()` */
  static readonly PackagesGetAllPackageVersionsForPackageOwnedByUserPath = '/users/{username}/packages/{package_type}/{package_name}/versions';

  /**
   * List package versions for a package owned by a user.
   *
   * Lists package versions for a public package owned by a specified user.
   *
   * To use this endpoint, you must authenticate using an access token with the `read:packages` scope. If the `package_type` belongs to a GitHub Packages registry that only supports repository-scoped permissions, your token must also include the `repo` scope. For the list of GitHub Packages registries that only support repository-scoped permissions, see "[About permissions for GitHub Packages](https://docs.github.com/packages/learn-github-packages/about-permissions-for-github-packages#permissions-for-repository-scoped-packages)."
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `packagesGetAllPackageVersionsForPackageOwnedByUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  packagesGetAllPackageVersionsForPackageOwnedByUser$Response(params: PackagesGetAllPackageVersionsForPackageOwnedByUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<PackageVersion>>> {
    return packagesGetAllPackageVersionsForPackageOwnedByUser(this.http, this.rootUrl, params, context);
  }

  /**
   * List package versions for a package owned by a user.
   *
   * Lists package versions for a public package owned by a specified user.
   *
   * To use this endpoint, you must authenticate using an access token with the `read:packages` scope. If the `package_type` belongs to a GitHub Packages registry that only supports repository-scoped permissions, your token must also include the `repo` scope. For the list of GitHub Packages registries that only support repository-scoped permissions, see "[About permissions for GitHub Packages](https://docs.github.com/packages/learn-github-packages/about-permissions-for-github-packages#permissions-for-repository-scoped-packages)."
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `packagesGetAllPackageVersionsForPackageOwnedByUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  packagesGetAllPackageVersionsForPackageOwnedByUser(params: PackagesGetAllPackageVersionsForPackageOwnedByUser$Params, context?: HttpContext): Observable<Array<PackageVersion>> {
    return this.packagesGetAllPackageVersionsForPackageOwnedByUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<PackageVersion>>): Array<PackageVersion> => r.body)
    );
  }

  /** Path part for operation `packagesGetPackageVersionForUser()` */
  static readonly PackagesGetPackageVersionForUserPath = '/users/{username}/packages/{package_type}/{package_name}/versions/{package_version_id}';

  /**
   * Get a package version for a user.
   *
   * Gets a specific package version for a public package owned by a specified user.
   *
   * At this time, to use this endpoint, you must authenticate using an access token with the `read:packages` scope. If the `package_type` belongs to a GitHub Packages registry that only supports repository-scoped permissions, your token must also include the `repo` scope. For the list of GitHub Packages registries that only support repository-scoped permissions, see "[About permissions for GitHub Packages](https://docs.github.com/packages/learn-github-packages/about-permissions-for-github-packages#permissions-for-repository-scoped-packages)."
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `packagesGetPackageVersionForUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  packagesGetPackageVersionForUser$Response(params: PackagesGetPackageVersionForUser$Params, context?: HttpContext): Observable<StrictHttpResponse<PackageVersion>> {
    return packagesGetPackageVersionForUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a package version for a user.
   *
   * Gets a specific package version for a public package owned by a specified user.
   *
   * At this time, to use this endpoint, you must authenticate using an access token with the `read:packages` scope. If the `package_type` belongs to a GitHub Packages registry that only supports repository-scoped permissions, your token must also include the `repo` scope. For the list of GitHub Packages registries that only support repository-scoped permissions, see "[About permissions for GitHub Packages](https://docs.github.com/packages/learn-github-packages/about-permissions-for-github-packages#permissions-for-repository-scoped-packages)."
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `packagesGetPackageVersionForUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  packagesGetPackageVersionForUser(params: PackagesGetPackageVersionForUser$Params, context?: HttpContext): Observable<PackageVersion> {
    return this.packagesGetPackageVersionForUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<PackageVersion>): PackageVersion => r.body)
    );
  }

  /** Path part for operation `packagesDeletePackageVersionForUser()` */
  static readonly PackagesDeletePackageVersionForUserPath = '/users/{username}/packages/{package_type}/{package_name}/versions/{package_version_id}';

  /**
   * Delete package version for a user.
   *
   * Deletes a specific package version for a user. If the package is public and the package version has more than 5,000 downloads, you cannot delete the package version. In this scenario, contact GitHub support for further assistance.
   *
   * To use this endpoint, you must authenticate using an access token with the `read:packages` and `delete:packages` scopes. In addition:
   * - If the `package_type` belongs to a GitHub Packages registry that only supports repository-scoped permissions, your token must also include the `repo` scope. For the list of these registries, see "[About permissions for GitHub Packages](https://docs.github.com/packages/learn-github-packages/about-permissions-for-github-packages#permissions-for-repository-scoped-packages)."
   * - If the `package_type` belongs to a GitHub Packages registry that supports granular permissions, you must have admin permissions to the package whose version you want to delete. For the list of these registries, see "[About permissions for GitHub Packages](https://docs.github.com/packages/learn-github-packages/about-permissions-for-github-packages#granular-permissions-for-userorganization-scoped-packages)."
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `packagesDeletePackageVersionForUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  packagesDeletePackageVersionForUser$Response(params: PackagesDeletePackageVersionForUser$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return packagesDeletePackageVersionForUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete package version for a user.
   *
   * Deletes a specific package version for a user. If the package is public and the package version has more than 5,000 downloads, you cannot delete the package version. In this scenario, contact GitHub support for further assistance.
   *
   * To use this endpoint, you must authenticate using an access token with the `read:packages` and `delete:packages` scopes. In addition:
   * - If the `package_type` belongs to a GitHub Packages registry that only supports repository-scoped permissions, your token must also include the `repo` scope. For the list of these registries, see "[About permissions for GitHub Packages](https://docs.github.com/packages/learn-github-packages/about-permissions-for-github-packages#permissions-for-repository-scoped-packages)."
   * - If the `package_type` belongs to a GitHub Packages registry that supports granular permissions, you must have admin permissions to the package whose version you want to delete. For the list of these registries, see "[About permissions for GitHub Packages](https://docs.github.com/packages/learn-github-packages/about-permissions-for-github-packages#granular-permissions-for-userorganization-scoped-packages)."
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `packagesDeletePackageVersionForUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  packagesDeletePackageVersionForUser(params: PackagesDeletePackageVersionForUser$Params, context?: HttpContext): Observable<void> {
    return this.packagesDeletePackageVersionForUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `packagesRestorePackageVersionForUser()` */
  static readonly PackagesRestorePackageVersionForUserPath = '/users/{username}/packages/{package_type}/{package_name}/versions/{package_version_id}/restore';

  /**
   * Restore package version for a user.
   *
   * Restores a specific package version for a user.
   *
   * You can restore a deleted package under the following conditions:
   *   - The package was deleted within the last 30 days.
   *   - The same package namespace and version is still available and not reused for a new package. If the same package namespace is not available, you will not be able to restore your package. In this scenario, to restore the deleted package, you must delete the new package that uses the deleted package's namespace first.
   *
   * To use this endpoint, you must authenticate using an access token with the `read:packages` and `write:packages` scopes. In addition:
   * - If the `package_type` belongs to a GitHub Packages registry that only supports repository-scoped permissions, your token must also include the `repo` scope. For the list of these registries, see "[About permissions for GitHub Packages](https://docs.github.com/packages/learn-github-packages/about-permissions-for-github-packages#permissions-for-repository-scoped-packages)."
   * - If the `package_type` belongs to a GitHub Packages registry that supports granular permissions, you must have admin permissions to the package whose version you want to restore. For the list of these registries, see "[About permissions for GitHub Packages](https://docs.github.com/packages/learn-github-packages/about-permissions-for-github-packages#granular-permissions-for-userorganization-scoped-packages)."
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `packagesRestorePackageVersionForUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  packagesRestorePackageVersionForUser$Response(params: PackagesRestorePackageVersionForUser$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return packagesRestorePackageVersionForUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Restore package version for a user.
   *
   * Restores a specific package version for a user.
   *
   * You can restore a deleted package under the following conditions:
   *   - The package was deleted within the last 30 days.
   *   - The same package namespace and version is still available and not reused for a new package. If the same package namespace is not available, you will not be able to restore your package. In this scenario, to restore the deleted package, you must delete the new package that uses the deleted package's namespace first.
   *
   * To use this endpoint, you must authenticate using an access token with the `read:packages` and `write:packages` scopes. In addition:
   * - If the `package_type` belongs to a GitHub Packages registry that only supports repository-scoped permissions, your token must also include the `repo` scope. For the list of these registries, see "[About permissions for GitHub Packages](https://docs.github.com/packages/learn-github-packages/about-permissions-for-github-packages#permissions-for-repository-scoped-packages)."
   * - If the `package_type` belongs to a GitHub Packages registry that supports granular permissions, you must have admin permissions to the package whose version you want to restore. For the list of these registries, see "[About permissions for GitHub Packages](https://docs.github.com/packages/learn-github-packages/about-permissions-for-github-packages#granular-permissions-for-userorganization-scoped-packages)."
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `packagesRestorePackageVersionForUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  packagesRestorePackageVersionForUser(params: PackagesRestorePackageVersionForUser$Params, context?: HttpContext): Observable<void> {
    return this.packagesRestorePackageVersionForUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

}
