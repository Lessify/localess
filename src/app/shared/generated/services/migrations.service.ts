/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { BaseService } from '../base-service';
import { ApiConfiguration } from '../api-configuration';
import { StrictHttpResponse } from '../strict-http-response';

import { Import } from '../models/import';
import { Migration } from '../models/migration';
import { migrationsCancelImport } from '../fn/migrations/migrations-cancel-import';
import { MigrationsCancelImport$Params } from '../fn/migrations/migrations-cancel-import';
import { migrationsDeleteArchiveForAuthenticatedUser } from '../fn/migrations/migrations-delete-archive-for-authenticated-user';
import { MigrationsDeleteArchiveForAuthenticatedUser$Params } from '../fn/migrations/migrations-delete-archive-for-authenticated-user';
import { migrationsDeleteArchiveForOrg } from '../fn/migrations/migrations-delete-archive-for-org';
import { MigrationsDeleteArchiveForOrg$Params } from '../fn/migrations/migrations-delete-archive-for-org';
import { migrationsDownloadArchiveForOrg } from '../fn/migrations/migrations-download-archive-for-org';
import { MigrationsDownloadArchiveForOrg$Params } from '../fn/migrations/migrations-download-archive-for-org';
import { migrationsGetArchiveForAuthenticatedUser } from '../fn/migrations/migrations-get-archive-for-authenticated-user';
import { MigrationsGetArchiveForAuthenticatedUser$Params } from '../fn/migrations/migrations-get-archive-for-authenticated-user';
import { migrationsGetCommitAuthors } from '../fn/migrations/migrations-get-commit-authors';
import { MigrationsGetCommitAuthors$Params } from '../fn/migrations/migrations-get-commit-authors';
import { migrationsGetImportStatus } from '../fn/migrations/migrations-get-import-status';
import { MigrationsGetImportStatus$Params } from '../fn/migrations/migrations-get-import-status';
import { migrationsGetLargeFiles } from '../fn/migrations/migrations-get-large-files';
import { MigrationsGetLargeFiles$Params } from '../fn/migrations/migrations-get-large-files';
import { migrationsGetStatusForAuthenticatedUser } from '../fn/migrations/migrations-get-status-for-authenticated-user';
import { MigrationsGetStatusForAuthenticatedUser$Params } from '../fn/migrations/migrations-get-status-for-authenticated-user';
import { migrationsGetStatusForOrg } from '../fn/migrations/migrations-get-status-for-org';
import { MigrationsGetStatusForOrg$Params } from '../fn/migrations/migrations-get-status-for-org';
import { migrationsListForAuthenticatedUser } from '../fn/migrations/migrations-list-for-authenticated-user';
import { MigrationsListForAuthenticatedUser$Params } from '../fn/migrations/migrations-list-for-authenticated-user';
import { migrationsListForOrg } from '../fn/migrations/migrations-list-for-org';
import { MigrationsListForOrg$Params } from '../fn/migrations/migrations-list-for-org';
import { migrationsListReposForAuthenticatedUser } from '../fn/migrations/migrations-list-repos-for-authenticated-user';
import { MigrationsListReposForAuthenticatedUser$Params } from '../fn/migrations/migrations-list-repos-for-authenticated-user';
import { migrationsListReposForOrg } from '../fn/migrations/migrations-list-repos-for-org';
import { MigrationsListReposForOrg$Params } from '../fn/migrations/migrations-list-repos-for-org';
import { migrationsMapCommitAuthor } from '../fn/migrations/migrations-map-commit-author';
import { MigrationsMapCommitAuthor$Params } from '../fn/migrations/migrations-map-commit-author';
import { migrationsSetLfsPreference } from '../fn/migrations/migrations-set-lfs-preference';
import { MigrationsSetLfsPreference$Params } from '../fn/migrations/migrations-set-lfs-preference';
import { migrationsStartForAuthenticatedUser } from '../fn/migrations/migrations-start-for-authenticated-user';
import { MigrationsStartForAuthenticatedUser$Params } from '../fn/migrations/migrations-start-for-authenticated-user';
import { migrationsStartForOrg } from '../fn/migrations/migrations-start-for-org';
import { MigrationsStartForOrg$Params } from '../fn/migrations/migrations-start-for-org';
import { migrationsStartImport } from '../fn/migrations/migrations-start-import';
import { MigrationsStartImport$Params } from '../fn/migrations/migrations-start-import';
import { migrationsUnlockRepoForAuthenticatedUser } from '../fn/migrations/migrations-unlock-repo-for-authenticated-user';
import { MigrationsUnlockRepoForAuthenticatedUser$Params } from '../fn/migrations/migrations-unlock-repo-for-authenticated-user';
import { migrationsUnlockRepoForOrg } from '../fn/migrations/migrations-unlock-repo-for-org';
import { MigrationsUnlockRepoForOrg$Params } from '../fn/migrations/migrations-unlock-repo-for-org';
import { migrationsUpdateImport } from '../fn/migrations/migrations-update-import';
import { MigrationsUpdateImport$Params } from '../fn/migrations/migrations-update-import';
import { MinimalRepository } from '../models/minimal-repository';
import { PorterAuthor } from '../models/porter-author';
import { PorterLargeFile } from '../models/porter-large-file';


/**
 * Move projects to or from GitHub.
 */
@Injectable({ providedIn: 'root' })
export class MigrationsService extends BaseService {
  constructor(config: ApiConfiguration, http: HttpClient) {
    super(config, http);
  }

  /** Path part for operation `migrationsListForOrg()` */
  static readonly MigrationsListForOrgPath = '/orgs/{org}/migrations';

  /**
   * List organization migrations.
   *
   * Lists the most recent migrations, including both exports (which can be started through the REST API) and imports (which cannot be started using the REST API).
   *
   * A list of `repositories` is only returned for export migrations.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `migrationsListForOrg()` instead.
   *
   * This method doesn't expect any request body.
   */
  migrationsListForOrg$Response(params: MigrationsListForOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Migration>>> {
    return migrationsListForOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * List organization migrations.
   *
   * Lists the most recent migrations, including both exports (which can be started through the REST API) and imports (which cannot be started using the REST API).
   *
   * A list of `repositories` is only returned for export migrations.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `migrationsListForOrg$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  migrationsListForOrg(params: MigrationsListForOrg$Params, context?: HttpContext): Observable<Array<Migration>> {
    return this.migrationsListForOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Migration>>): Array<Migration> => r.body)
    );
  }

  /** Path part for operation `migrationsStartForOrg()` */
  static readonly MigrationsStartForOrgPath = '/orgs/{org}/migrations';

  /**
   * Start an organization migration.
   *
   * Initiates the generation of a migration archive.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `migrationsStartForOrg()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  migrationsStartForOrg$Response(params: MigrationsStartForOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<Migration>> {
    return migrationsStartForOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * Start an organization migration.
   *
   * Initiates the generation of a migration archive.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `migrationsStartForOrg$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  migrationsStartForOrg(params: MigrationsStartForOrg$Params, context?: HttpContext): Observable<Migration> {
    return this.migrationsStartForOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<Migration>): Migration => r.body)
    );
  }

  /** Path part for operation `migrationsGetStatusForOrg()` */
  static readonly MigrationsGetStatusForOrgPath = '/orgs/{org}/migrations/{migration_id}';

  /**
   * Get an organization migration status.
   *
   * Fetches the status of a migration.
   *
   * The `state` of a migration can be one of the following values:
   *
   * *   `pending`, which means the migration hasn't started yet.
   * *   `exporting`, which means the migration is in progress.
   * *   `exported`, which means the migration finished successfully.
   * *   `failed`, which means the migration failed.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `migrationsGetStatusForOrg()` instead.
   *
   * This method doesn't expect any request body.
   */
  migrationsGetStatusForOrg$Response(params: MigrationsGetStatusForOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<Migration>> {
    return migrationsGetStatusForOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * Get an organization migration status.
   *
   * Fetches the status of a migration.
   *
   * The `state` of a migration can be one of the following values:
   *
   * *   `pending`, which means the migration hasn't started yet.
   * *   `exporting`, which means the migration is in progress.
   * *   `exported`, which means the migration finished successfully.
   * *   `failed`, which means the migration failed.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `migrationsGetStatusForOrg$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  migrationsGetStatusForOrg(params: MigrationsGetStatusForOrg$Params, context?: HttpContext): Observable<Migration> {
    return this.migrationsGetStatusForOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<Migration>): Migration => r.body)
    );
  }

  /** Path part for operation `migrationsDownloadArchiveForOrg()` */
  static readonly MigrationsDownloadArchiveForOrgPath = '/orgs/{org}/migrations/{migration_id}/archive';

  /**
   * Download an organization migration archive.
   *
   * Fetches the URL to a migration archive.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `migrationsDownloadArchiveForOrg()` instead.
   *
   * This method doesn't expect any request body.
   */
  migrationsDownloadArchiveForOrg$Response(params: MigrationsDownloadArchiveForOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return migrationsDownloadArchiveForOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * Download an organization migration archive.
   *
   * Fetches the URL to a migration archive.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `migrationsDownloadArchiveForOrg$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  migrationsDownloadArchiveForOrg(params: MigrationsDownloadArchiveForOrg$Params, context?: HttpContext): Observable<void> {
    return this.migrationsDownloadArchiveForOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `migrationsDeleteArchiveForOrg()` */
  static readonly MigrationsDeleteArchiveForOrgPath = '/orgs/{org}/migrations/{migration_id}/archive';

  /**
   * Delete an organization migration archive.
   *
   * Deletes a previous migration archive. Migration archives are automatically deleted after seven days.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `migrationsDeleteArchiveForOrg()` instead.
   *
   * This method doesn't expect any request body.
   */
  migrationsDeleteArchiveForOrg$Response(params: MigrationsDeleteArchiveForOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return migrationsDeleteArchiveForOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete an organization migration archive.
   *
   * Deletes a previous migration archive. Migration archives are automatically deleted after seven days.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `migrationsDeleteArchiveForOrg$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  migrationsDeleteArchiveForOrg(params: MigrationsDeleteArchiveForOrg$Params, context?: HttpContext): Observable<void> {
    return this.migrationsDeleteArchiveForOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `migrationsUnlockRepoForOrg()` */
  static readonly MigrationsUnlockRepoForOrgPath = '/orgs/{org}/migrations/{migration_id}/repos/{repo_name}/lock';

  /**
   * Unlock an organization repository.
   *
   * Unlocks a repository that was locked for migration. You should unlock each migrated repository and [delete them](https://docs.github.com/rest/repos/repos#delete-a-repository) when the migration is complete and you no longer need the source data.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `migrationsUnlockRepoForOrg()` instead.
   *
   * This method doesn't expect any request body.
   */
  migrationsUnlockRepoForOrg$Response(params: MigrationsUnlockRepoForOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return migrationsUnlockRepoForOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * Unlock an organization repository.
   *
   * Unlocks a repository that was locked for migration. You should unlock each migrated repository and [delete them](https://docs.github.com/rest/repos/repos#delete-a-repository) when the migration is complete and you no longer need the source data.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `migrationsUnlockRepoForOrg$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  migrationsUnlockRepoForOrg(params: MigrationsUnlockRepoForOrg$Params, context?: HttpContext): Observable<void> {
    return this.migrationsUnlockRepoForOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `migrationsListReposForOrg()` */
  static readonly MigrationsListReposForOrgPath = '/orgs/{org}/migrations/{migration_id}/repositories';

  /**
   * List repositories in an organization migration.
   *
   * List all the repositories for this organization migration.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `migrationsListReposForOrg()` instead.
   *
   * This method doesn't expect any request body.
   */
  migrationsListReposForOrg$Response(params: MigrationsListReposForOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<MinimalRepository>>> {
    return migrationsListReposForOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * List repositories in an organization migration.
   *
   * List all the repositories for this organization migration.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `migrationsListReposForOrg$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  migrationsListReposForOrg(params: MigrationsListReposForOrg$Params, context?: HttpContext): Observable<Array<MinimalRepository>> {
    return this.migrationsListReposForOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<MinimalRepository>>): Array<MinimalRepository> => r.body)
    );
  }

  /** Path part for operation `migrationsGetImportStatus()` */
  static readonly MigrationsGetImportStatusPath = '/repos/{owner}/{repo}/import';

  /**
   * Get an import status.
   *
   * View the progress of an import.
   *
   * **Warning:** Support for importing Mercurial, Subversion and Team Foundation Version Control repositories will end
   * on October 17, 2023. For more details, see [changelog](https://gh.io/github-importer-non-git-eol). In the coming weeks, we will update
   * these docs to reflect relevant changes to the API and will contact all integrators using the "Source imports" API.
   *
   * **Import status**
   *
   * This section includes details about the possible values of the `status` field of the Import Progress response.
   *
   * An import that does not have errors will progress through these steps:
   *
   * *   `detecting` - the "detection" step of the import is in progress because the request did not include a `vcs` parameter. The import is identifying the type of source control present at the URL.
   * *   `importing` - the "raw" step of the import is in progress. This is where commit data is fetched from the original repository. The import progress response will include `commit_count` (the total number of raw commits that will be imported) and `percent` (0 - 100, the current progress through the import).
   * *   `mapping` - the "rewrite" step of the import is in progress. This is where SVN branches are converted to Git branches, and where author updates are applied. The import progress response does not include progress information.
   * *   `pushing` - the "push" step of the import is in progress. This is where the importer updates the repository on GitHub. The import progress response will include `push_percent`, which is the percent value reported by `git push` when it is "Writing objects".
   * *   `complete` - the import is complete, and the repository is ready on GitHub.
   *
   * If there are problems, you will see one of these in the `status` field:
   *
   * *   `auth_failed` - the import requires authentication in order to connect to the original repository. To update authentication for the import, please see the [Update an import](https://docs.github.com/rest/migrations/source-imports#update-an-import) section.
   * *   `error` - the import encountered an error. The import progress response will include the `failed_step` and an error message. Contact [GitHub Support](https://support.github.com/contact?tags=dotcom-rest-api) for more information.
   * *   `detection_needs_auth` - the importer requires authentication for the originating repository to continue detection. To update authentication for the import, please see the [Update an import](https://docs.github.com/rest/migrations/source-imports#update-an-import) section.
   * *   `detection_found_nothing` - the importer didn't recognize any source control at the URL. To resolve, [Cancel the import](https://docs.github.com/rest/migrations/source-imports#cancel-an-import) and [retry](https://docs.github.com/rest/migrations/source-imports#start-an-import) with the correct URL.
   * *   `detection_found_multiple` - the importer found several projects or repositories at the provided URL. When this is the case, the Import Progress response will also include a `project_choices` field with the possible project choices as values. To update project choice, please see the [Update an import](https://docs.github.com/rest/migrations/source-imports#update-an-import) section.
   *
   * **The project_choices field**
   *
   * When multiple projects are found at the provided URL, the response hash will include a `project_choices` field, the value of which is an array of hashes each representing a project choice. The exact key/value pairs of the project hashes will differ depending on the version control type.
   *
   * **Git LFS related fields**
   *
   * This section includes details about Git LFS related fields that may be present in the Import Progress response.
   *
   * *   `use_lfs` - describes whether the import has been opted in or out of using Git LFS. The value can be `opt_in`, `opt_out`, or `undecided` if no action has been taken.
   * *   `has_large_files` - the boolean value describing whether files larger than 100MB were found during the `importing` step.
   * *   `large_files_size` - the total size in gigabytes of files larger than 100MB found in the originating repository.
   * *   `large_files_count` - the total number of files larger than 100MB found in the originating repository. To see a list of these files, make a "Get Large Files" request.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `migrationsGetImportStatus()` instead.
   *
   * This method doesn't expect any request body.
   */
  migrationsGetImportStatus$Response(params: MigrationsGetImportStatus$Params, context?: HttpContext): Observable<StrictHttpResponse<Import>> {
    return migrationsGetImportStatus(this.http, this.rootUrl, params, context);
  }

  /**
   * Get an import status.
   *
   * View the progress of an import.
   *
   * **Warning:** Support for importing Mercurial, Subversion and Team Foundation Version Control repositories will end
   * on October 17, 2023. For more details, see [changelog](https://gh.io/github-importer-non-git-eol). In the coming weeks, we will update
   * these docs to reflect relevant changes to the API and will contact all integrators using the "Source imports" API.
   *
   * **Import status**
   *
   * This section includes details about the possible values of the `status` field of the Import Progress response.
   *
   * An import that does not have errors will progress through these steps:
   *
   * *   `detecting` - the "detection" step of the import is in progress because the request did not include a `vcs` parameter. The import is identifying the type of source control present at the URL.
   * *   `importing` - the "raw" step of the import is in progress. This is where commit data is fetched from the original repository. The import progress response will include `commit_count` (the total number of raw commits that will be imported) and `percent` (0 - 100, the current progress through the import).
   * *   `mapping` - the "rewrite" step of the import is in progress. This is where SVN branches are converted to Git branches, and where author updates are applied. The import progress response does not include progress information.
   * *   `pushing` - the "push" step of the import is in progress. This is where the importer updates the repository on GitHub. The import progress response will include `push_percent`, which is the percent value reported by `git push` when it is "Writing objects".
   * *   `complete` - the import is complete, and the repository is ready on GitHub.
   *
   * If there are problems, you will see one of these in the `status` field:
   *
   * *   `auth_failed` - the import requires authentication in order to connect to the original repository. To update authentication for the import, please see the [Update an import](https://docs.github.com/rest/migrations/source-imports#update-an-import) section.
   * *   `error` - the import encountered an error. The import progress response will include the `failed_step` and an error message. Contact [GitHub Support](https://support.github.com/contact?tags=dotcom-rest-api) for more information.
   * *   `detection_needs_auth` - the importer requires authentication for the originating repository to continue detection. To update authentication for the import, please see the [Update an import](https://docs.github.com/rest/migrations/source-imports#update-an-import) section.
   * *   `detection_found_nothing` - the importer didn't recognize any source control at the URL. To resolve, [Cancel the import](https://docs.github.com/rest/migrations/source-imports#cancel-an-import) and [retry](https://docs.github.com/rest/migrations/source-imports#start-an-import) with the correct URL.
   * *   `detection_found_multiple` - the importer found several projects or repositories at the provided URL. When this is the case, the Import Progress response will also include a `project_choices` field with the possible project choices as values. To update project choice, please see the [Update an import](https://docs.github.com/rest/migrations/source-imports#update-an-import) section.
   *
   * **The project_choices field**
   *
   * When multiple projects are found at the provided URL, the response hash will include a `project_choices` field, the value of which is an array of hashes each representing a project choice. The exact key/value pairs of the project hashes will differ depending on the version control type.
   *
   * **Git LFS related fields**
   *
   * This section includes details about Git LFS related fields that may be present in the Import Progress response.
   *
   * *   `use_lfs` - describes whether the import has been opted in or out of using Git LFS. The value can be `opt_in`, `opt_out`, or `undecided` if no action has been taken.
   * *   `has_large_files` - the boolean value describing whether files larger than 100MB were found during the `importing` step.
   * *   `large_files_size` - the total size in gigabytes of files larger than 100MB found in the originating repository.
   * *   `large_files_count` - the total number of files larger than 100MB found in the originating repository. To see a list of these files, make a "Get Large Files" request.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `migrationsGetImportStatus$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  migrationsGetImportStatus(params: MigrationsGetImportStatus$Params, context?: HttpContext): Observable<Import> {
    return this.migrationsGetImportStatus$Response(params, context).pipe(
      map((r: StrictHttpResponse<Import>): Import => r.body)
    );
  }

  /** Path part for operation `migrationsStartImport()` */
  static readonly MigrationsStartImportPath = '/repos/{owner}/{repo}/import';

  /**
   * Start an import.
   *
   * Start a source import to a GitHub repository using GitHub Importer. Importing into a GitHub repository with GitHub Actions enabled is not supported and will return a status `422 Unprocessable Entity` response.
   * **Warning:** Support for importing Mercurial, Subversion and Team Foundation Version Control repositories will end on October 17, 2023. For more details, see [changelog](https://gh.io/github-importer-non-git-eol). In the coming weeks, we will update these docs to reflect relevant changes to the API and will contact all integrators using the "Source imports" API.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `migrationsStartImport()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  migrationsStartImport$Response(params: MigrationsStartImport$Params, context?: HttpContext): Observable<StrictHttpResponse<Import>> {
    return migrationsStartImport(this.http, this.rootUrl, params, context);
  }

  /**
   * Start an import.
   *
   * Start a source import to a GitHub repository using GitHub Importer. Importing into a GitHub repository with GitHub Actions enabled is not supported and will return a status `422 Unprocessable Entity` response.
   * **Warning:** Support for importing Mercurial, Subversion and Team Foundation Version Control repositories will end on October 17, 2023. For more details, see [changelog](https://gh.io/github-importer-non-git-eol). In the coming weeks, we will update these docs to reflect relevant changes to the API and will contact all integrators using the "Source imports" API.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `migrationsStartImport$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  migrationsStartImport(params: MigrationsStartImport$Params, context?: HttpContext): Observable<Import> {
    return this.migrationsStartImport$Response(params, context).pipe(
      map((r: StrictHttpResponse<Import>): Import => r.body)
    );
  }

  /** Path part for operation `migrationsCancelImport()` */
  static readonly MigrationsCancelImportPath = '/repos/{owner}/{repo}/import';

  /**
   * Cancel an import.
   *
   * Stop an import for a repository.
   *
   * **Warning:** Support for importing Mercurial, Subversion and Team Foundation Version Control repositories will end
   * on October 17, 2023. For more details, see [changelog](https://gh.io/github-importer-non-git-eol). In the coming weeks, we will update
   * these docs to reflect relevant changes to the API and will contact all integrators using the "Source imports" API.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `migrationsCancelImport()` instead.
   *
   * This method doesn't expect any request body.
   */
  migrationsCancelImport$Response(params: MigrationsCancelImport$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return migrationsCancelImport(this.http, this.rootUrl, params, context);
  }

  /**
   * Cancel an import.
   *
   * Stop an import for a repository.
   *
   * **Warning:** Support for importing Mercurial, Subversion and Team Foundation Version Control repositories will end
   * on October 17, 2023. For more details, see [changelog](https://gh.io/github-importer-non-git-eol). In the coming weeks, we will update
   * these docs to reflect relevant changes to the API and will contact all integrators using the "Source imports" API.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `migrationsCancelImport$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  migrationsCancelImport(params: MigrationsCancelImport$Params, context?: HttpContext): Observable<void> {
    return this.migrationsCancelImport$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `migrationsUpdateImport()` */
  static readonly MigrationsUpdateImportPath = '/repos/{owner}/{repo}/import';

  /**
   * Update an import.
   *
   * An import can be updated with credentials or a project choice by passing in the appropriate parameters in this API
   * request. If no parameters are provided, the import will be restarted.
   *
   * Some servers (e.g. TFS servers) can have several projects at a single URL. In those cases the import progress will
   * have the status `detection_found_multiple` and the Import Progress response will include a `project_choices` array.
   * You can select the project to import by providing one of the objects in the `project_choices` array in the update request.
   *
   * **Warning:** Support for importing Mercurial, Subversion and Team Foundation Version Control repositories will end
   * on October 17, 2023. For more details, see [changelog](https://gh.io/github-importer-non-git-eol). In the coming weeks, we will update
   * these docs to reflect relevant changes to the API and will contact all integrators using the "Source imports" API.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `migrationsUpdateImport()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  migrationsUpdateImport$Response(params: MigrationsUpdateImport$Params, context?: HttpContext): Observable<StrictHttpResponse<Import>> {
    return migrationsUpdateImport(this.http, this.rootUrl, params, context);
  }

  /**
   * Update an import.
   *
   * An import can be updated with credentials or a project choice by passing in the appropriate parameters in this API
   * request. If no parameters are provided, the import will be restarted.
   *
   * Some servers (e.g. TFS servers) can have several projects at a single URL. In those cases the import progress will
   * have the status `detection_found_multiple` and the Import Progress response will include a `project_choices` array.
   * You can select the project to import by providing one of the objects in the `project_choices` array in the update request.
   *
   * **Warning:** Support for importing Mercurial, Subversion and Team Foundation Version Control repositories will end
   * on October 17, 2023. For more details, see [changelog](https://gh.io/github-importer-non-git-eol). In the coming weeks, we will update
   * these docs to reflect relevant changes to the API and will contact all integrators using the "Source imports" API.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `migrationsUpdateImport$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  migrationsUpdateImport(params: MigrationsUpdateImport$Params, context?: HttpContext): Observable<Import> {
    return this.migrationsUpdateImport$Response(params, context).pipe(
      map((r: StrictHttpResponse<Import>): Import => r.body)
    );
  }

  /** Path part for operation `migrationsGetCommitAuthors()` */
  static readonly MigrationsGetCommitAuthorsPath = '/repos/{owner}/{repo}/import/authors';

  /**
   * Get commit authors.
   *
   * Each type of source control system represents authors in a different way. For example, a Git commit author has a display name and an email address, but a Subversion commit author just has a username. The GitHub Importer will make the author information valid, but the author might not be correct. For example, it will change the bare Subversion username `hubot` into something like `hubot <hubot@12341234-abab-fefe-8787-fedcba987654>`.
   *
   * This endpoint and the [Map a commit author](https://docs.github.com/rest/migrations/source-imports#map-a-commit-author) endpoint allow you to provide correct Git author information.
   *
   * **Warning:** Support for importing Mercurial, Subversion and Team Foundation Version Control repositories will end
   * on October 17, 2023. For more details, see [changelog](https://gh.io/github-importer-non-git-eol). In the coming weeks, we will update
   * these docs to reflect relevant changes to the API and will contact all integrators using the "Source imports" API.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `migrationsGetCommitAuthors()` instead.
   *
   * This method doesn't expect any request body.
   */
  migrationsGetCommitAuthors$Response(params: MigrationsGetCommitAuthors$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<PorterAuthor>>> {
    return migrationsGetCommitAuthors(this.http, this.rootUrl, params, context);
  }

  /**
   * Get commit authors.
   *
   * Each type of source control system represents authors in a different way. For example, a Git commit author has a display name and an email address, but a Subversion commit author just has a username. The GitHub Importer will make the author information valid, but the author might not be correct. For example, it will change the bare Subversion username `hubot` into something like `hubot <hubot@12341234-abab-fefe-8787-fedcba987654>`.
   *
   * This endpoint and the [Map a commit author](https://docs.github.com/rest/migrations/source-imports#map-a-commit-author) endpoint allow you to provide correct Git author information.
   *
   * **Warning:** Support for importing Mercurial, Subversion and Team Foundation Version Control repositories will end
   * on October 17, 2023. For more details, see [changelog](https://gh.io/github-importer-non-git-eol). In the coming weeks, we will update
   * these docs to reflect relevant changes to the API and will contact all integrators using the "Source imports" API.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `migrationsGetCommitAuthors$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  migrationsGetCommitAuthors(params: MigrationsGetCommitAuthors$Params, context?: HttpContext): Observable<Array<PorterAuthor>> {
    return this.migrationsGetCommitAuthors$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<PorterAuthor>>): Array<PorterAuthor> => r.body)
    );
  }

  /** Path part for operation `migrationsMapCommitAuthor()` */
  static readonly MigrationsMapCommitAuthorPath = '/repos/{owner}/{repo}/import/authors/{author_id}';

  /**
   * Map a commit author.
   *
   * Update an author's identity for the import. Your application can continue updating authors any time before you push
   * new commits to the repository.
   *
   * **Warning:** Support for importing Mercurial, Subversion and Team Foundation Version Control repositories will end
   * on October 17, 2023. For more details, see [changelog](https://gh.io/github-importer-non-git-eol). In the coming weeks, we will update
   * these docs to reflect relevant changes to the API and will contact all integrators using the "Source imports" API.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `migrationsMapCommitAuthor()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  migrationsMapCommitAuthor$Response(params: MigrationsMapCommitAuthor$Params, context?: HttpContext): Observable<StrictHttpResponse<PorterAuthor>> {
    return migrationsMapCommitAuthor(this.http, this.rootUrl, params, context);
  }

  /**
   * Map a commit author.
   *
   * Update an author's identity for the import. Your application can continue updating authors any time before you push
   * new commits to the repository.
   *
   * **Warning:** Support for importing Mercurial, Subversion and Team Foundation Version Control repositories will end
   * on October 17, 2023. For more details, see [changelog](https://gh.io/github-importer-non-git-eol). In the coming weeks, we will update
   * these docs to reflect relevant changes to the API and will contact all integrators using the "Source imports" API.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `migrationsMapCommitAuthor$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  migrationsMapCommitAuthor(params: MigrationsMapCommitAuthor$Params, context?: HttpContext): Observable<PorterAuthor> {
    return this.migrationsMapCommitAuthor$Response(params, context).pipe(
      map((r: StrictHttpResponse<PorterAuthor>): PorterAuthor => r.body)
    );
  }

  /** Path part for operation `migrationsGetLargeFiles()` */
  static readonly MigrationsGetLargeFilesPath = '/repos/{owner}/{repo}/import/large_files';

  /**
   * Get large files.
   *
   * List files larger than 100MB found during the import
   *
   * **Warning:** Support for importing Mercurial, Subversion and Team Foundation Version Control repositories will end
   * on October 17, 2023. For more details, see [changelog](https://gh.io/github-importer-non-git-eol). In the coming weeks, we will update
   * these docs to reflect relevant changes to the API and will contact all integrators using the "Source imports" API.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `migrationsGetLargeFiles()` instead.
   *
   * This method doesn't expect any request body.
   */
  migrationsGetLargeFiles$Response(params: MigrationsGetLargeFiles$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<PorterLargeFile>>> {
    return migrationsGetLargeFiles(this.http, this.rootUrl, params, context);
  }

  /**
   * Get large files.
   *
   * List files larger than 100MB found during the import
   *
   * **Warning:** Support for importing Mercurial, Subversion and Team Foundation Version Control repositories will end
   * on October 17, 2023. For more details, see [changelog](https://gh.io/github-importer-non-git-eol). In the coming weeks, we will update
   * these docs to reflect relevant changes to the API and will contact all integrators using the "Source imports" API.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `migrationsGetLargeFiles$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  migrationsGetLargeFiles(params: MigrationsGetLargeFiles$Params, context?: HttpContext): Observable<Array<PorterLargeFile>> {
    return this.migrationsGetLargeFiles$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<PorterLargeFile>>): Array<PorterLargeFile> => r.body)
    );
  }

  /** Path part for operation `migrationsSetLfsPreference()` */
  static readonly MigrationsSetLfsPreferencePath = '/repos/{owner}/{repo}/import/lfs';

  /**
   * Update Git LFS preference.
   *
   * You can import repositories from Subversion, Mercurial, and TFS that include files larger than 100MB. This ability
   * is powered by [Git LFS](https://git-lfs.com).
   *
   * You can learn more about our LFS feature and working with large files [on our help
   * site](https://docs.github.com/repositories/working-with-files/managing-large-files).
   *
   * **Warning:** Support for importing Mercurial, Subversion and Team Foundation Version Control repositories will end
   * on October 17, 2023. For more details, see [changelog](https://gh.io/github-importer-non-git-eol). In the coming weeks, we will update
   * these docs to reflect relevant changes to the API and will contact all integrators using the "Source imports" API.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `migrationsSetLfsPreference()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  migrationsSetLfsPreference$Response(params: MigrationsSetLfsPreference$Params, context?: HttpContext): Observable<StrictHttpResponse<Import>> {
    return migrationsSetLfsPreference(this.http, this.rootUrl, params, context);
  }

  /**
   * Update Git LFS preference.
   *
   * You can import repositories from Subversion, Mercurial, and TFS that include files larger than 100MB. This ability
   * is powered by [Git LFS](https://git-lfs.com).
   *
   * You can learn more about our LFS feature and working with large files [on our help
   * site](https://docs.github.com/repositories/working-with-files/managing-large-files).
   *
   * **Warning:** Support for importing Mercurial, Subversion and Team Foundation Version Control repositories will end
   * on October 17, 2023. For more details, see [changelog](https://gh.io/github-importer-non-git-eol). In the coming weeks, we will update
   * these docs to reflect relevant changes to the API and will contact all integrators using the "Source imports" API.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `migrationsSetLfsPreference$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  migrationsSetLfsPreference(params: MigrationsSetLfsPreference$Params, context?: HttpContext): Observable<Import> {
    return this.migrationsSetLfsPreference$Response(params, context).pipe(
      map((r: StrictHttpResponse<Import>): Import => r.body)
    );
  }

  /** Path part for operation `migrationsListForAuthenticatedUser()` */
  static readonly MigrationsListForAuthenticatedUserPath = '/user/migrations';

  /**
   * List user migrations.
   *
   * Lists all migrations a user has started.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `migrationsListForAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  migrationsListForAuthenticatedUser$Response(params?: MigrationsListForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Migration>>> {
    return migrationsListForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * List user migrations.
   *
   * Lists all migrations a user has started.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `migrationsListForAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  migrationsListForAuthenticatedUser(params?: MigrationsListForAuthenticatedUser$Params, context?: HttpContext): Observable<Array<Migration>> {
    return this.migrationsListForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Migration>>): Array<Migration> => r.body)
    );
  }

  /** Path part for operation `migrationsStartForAuthenticatedUser()` */
  static readonly MigrationsStartForAuthenticatedUserPath = '/user/migrations';

  /**
   * Start a user migration.
   *
   * Initiates the generation of a user migration archive.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `migrationsStartForAuthenticatedUser()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  migrationsStartForAuthenticatedUser$Response(params: MigrationsStartForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Migration>> {
    return migrationsStartForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Start a user migration.
   *
   * Initiates the generation of a user migration archive.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `migrationsStartForAuthenticatedUser$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  migrationsStartForAuthenticatedUser(params: MigrationsStartForAuthenticatedUser$Params, context?: HttpContext): Observable<Migration> {
    return this.migrationsStartForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<Migration>): Migration => r.body)
    );
  }

  /** Path part for operation `migrationsGetStatusForAuthenticatedUser()` */
  static readonly MigrationsGetStatusForAuthenticatedUserPath = '/user/migrations/{migration_id}';

  /**
   * Get a user migration status.
   *
   * Fetches a single user migration. The response includes the `state` of the migration, which can be one of the following values:
   *
   * *   `pending` - the migration hasn't started yet.
   * *   `exporting` - the migration is in progress.
   * *   `exported` - the migration finished successfully.
   * *   `failed` - the migration failed.
   *
   * Once the migration has been `exported` you can [download the migration archive](https://docs.github.com/rest/migrations/users#download-a-user-migration-archive).
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `migrationsGetStatusForAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  migrationsGetStatusForAuthenticatedUser$Response(params: MigrationsGetStatusForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Migration>> {
    return migrationsGetStatusForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a user migration status.
   *
   * Fetches a single user migration. The response includes the `state` of the migration, which can be one of the following values:
   *
   * *   `pending` - the migration hasn't started yet.
   * *   `exporting` - the migration is in progress.
   * *   `exported` - the migration finished successfully.
   * *   `failed` - the migration failed.
   *
   * Once the migration has been `exported` you can [download the migration archive](https://docs.github.com/rest/migrations/users#download-a-user-migration-archive).
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `migrationsGetStatusForAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  migrationsGetStatusForAuthenticatedUser(params: MigrationsGetStatusForAuthenticatedUser$Params, context?: HttpContext): Observable<Migration> {
    return this.migrationsGetStatusForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<Migration>): Migration => r.body)
    );
  }

  /** Path part for operation `migrationsGetArchiveForAuthenticatedUser()` */
  static readonly MigrationsGetArchiveForAuthenticatedUserPath = '/user/migrations/{migration_id}/archive';

  /**
   * Download a user migration archive.
   *
   * Fetches the URL to download the migration archive as a `tar.gz` file. Depending on the resources your repository uses, the migration archive can contain JSON files with data for these objects:
   *
   * *   attachments
   * *   bases
   * *   commit\_comments
   * *   issue\_comments
   * *   issue\_events
   * *   issues
   * *   milestones
   * *   organizations
   * *   projects
   * *   protected\_branches
   * *   pull\_request\_reviews
   * *   pull\_requests
   * *   releases
   * *   repositories
   * *   review\_comments
   * *   schema
   * *   users
   *
   * The archive will also contain an `attachments` directory that includes all attachment files uploaded to GitHub.com and a `repositories` directory that contains the repository's Git data.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `migrationsGetArchiveForAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  migrationsGetArchiveForAuthenticatedUser$Response(params: MigrationsGetArchiveForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return migrationsGetArchiveForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Download a user migration archive.
   *
   * Fetches the URL to download the migration archive as a `tar.gz` file. Depending on the resources your repository uses, the migration archive can contain JSON files with data for these objects:
   *
   * *   attachments
   * *   bases
   * *   commit\_comments
   * *   issue\_comments
   * *   issue\_events
   * *   issues
   * *   milestones
   * *   organizations
   * *   projects
   * *   protected\_branches
   * *   pull\_request\_reviews
   * *   pull\_requests
   * *   releases
   * *   repositories
   * *   review\_comments
   * *   schema
   * *   users
   *
   * The archive will also contain an `attachments` directory that includes all attachment files uploaded to GitHub.com and a `repositories` directory that contains the repository's Git data.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `migrationsGetArchiveForAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  migrationsGetArchiveForAuthenticatedUser(params: MigrationsGetArchiveForAuthenticatedUser$Params, context?: HttpContext): Observable<void> {
    return this.migrationsGetArchiveForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `migrationsDeleteArchiveForAuthenticatedUser()` */
  static readonly MigrationsDeleteArchiveForAuthenticatedUserPath = '/user/migrations/{migration_id}/archive';

  /**
   * Delete a user migration archive.
   *
   * Deletes a previous migration archive. Downloadable migration archives are automatically deleted after seven days. Migration metadata, which is returned in the [List user migrations](https://docs.github.com/rest/migrations/users#list-user-migrations) and [Get a user migration status](https://docs.github.com/rest/migrations/users#get-a-user-migration-status) endpoints, will continue to be available even after an archive is deleted.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `migrationsDeleteArchiveForAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  migrationsDeleteArchiveForAuthenticatedUser$Response(params: MigrationsDeleteArchiveForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return migrationsDeleteArchiveForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete a user migration archive.
   *
   * Deletes a previous migration archive. Downloadable migration archives are automatically deleted after seven days. Migration metadata, which is returned in the [List user migrations](https://docs.github.com/rest/migrations/users#list-user-migrations) and [Get a user migration status](https://docs.github.com/rest/migrations/users#get-a-user-migration-status) endpoints, will continue to be available even after an archive is deleted.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `migrationsDeleteArchiveForAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  migrationsDeleteArchiveForAuthenticatedUser(params: MigrationsDeleteArchiveForAuthenticatedUser$Params, context?: HttpContext): Observable<void> {
    return this.migrationsDeleteArchiveForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `migrationsUnlockRepoForAuthenticatedUser()` */
  static readonly MigrationsUnlockRepoForAuthenticatedUserPath = '/user/migrations/{migration_id}/repos/{repo_name}/lock';

  /**
   * Unlock a user repository.
   *
   * Unlocks a repository. You can lock repositories when you [start a user migration](https://docs.github.com/rest/migrations/users#start-a-user-migration). Once the migration is complete you can unlock each repository to begin using it again or [delete the repository](https://docs.github.com/rest/repos/repos#delete-a-repository) if you no longer need the source data. Returns a status of `404 Not Found` if the repository is not locked.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `migrationsUnlockRepoForAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  migrationsUnlockRepoForAuthenticatedUser$Response(params: MigrationsUnlockRepoForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return migrationsUnlockRepoForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Unlock a user repository.
   *
   * Unlocks a repository. You can lock repositories when you [start a user migration](https://docs.github.com/rest/migrations/users#start-a-user-migration). Once the migration is complete you can unlock each repository to begin using it again or [delete the repository](https://docs.github.com/rest/repos/repos#delete-a-repository) if you no longer need the source data. Returns a status of `404 Not Found` if the repository is not locked.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `migrationsUnlockRepoForAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  migrationsUnlockRepoForAuthenticatedUser(params: MigrationsUnlockRepoForAuthenticatedUser$Params, context?: HttpContext): Observable<void> {
    return this.migrationsUnlockRepoForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `migrationsListReposForAuthenticatedUser()` */
  static readonly MigrationsListReposForAuthenticatedUserPath = '/user/migrations/{migration_id}/repositories';

  /**
   * List repositories for a user migration.
   *
   * Lists all the repositories for this user migration.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `migrationsListReposForAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  migrationsListReposForAuthenticatedUser$Response(params: MigrationsListReposForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<MinimalRepository>>> {
    return migrationsListReposForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * List repositories for a user migration.
   *
   * Lists all the repositories for this user migration.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `migrationsListReposForAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  migrationsListReposForAuthenticatedUser(params: MigrationsListReposForAuthenticatedUser$Params, context?: HttpContext): Observable<Array<MinimalRepository>> {
    return this.migrationsListReposForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<MinimalRepository>>): Array<MinimalRepository> => r.body)
    );
  }

}
