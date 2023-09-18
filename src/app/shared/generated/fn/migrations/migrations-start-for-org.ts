/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Migration } from '../../models/migration';

export interface MigrationsStartForOrg$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;
      body: {

/**
 * A list of arrays indicating which repositories should be migrated.
 */
'repositories': Array<string>;

/**
 * Indicates whether repositories should be locked (to prevent manipulation) while migrating data.
 */
'lock_repositories'?: boolean;

/**
 * Indicates whether metadata should be excluded and only git source should be included for the migration.
 */
'exclude_metadata'?: boolean;

/**
 * Indicates whether the repository git data should be excluded from the migration.
 */
'exclude_git_data'?: boolean;

/**
 * Indicates whether attachments should be excluded from the migration (to reduce migration archive file size).
 */
'exclude_attachments'?: boolean;

/**
 * Indicates whether releases should be excluded from the migration (to reduce migration archive file size).
 */
'exclude_releases'?: boolean;

/**
 * Indicates whether projects owned by the organization or users should be excluded. from the migration.
 */
'exclude_owner_projects'?: boolean;

/**
 * Indicates whether this should only include organization metadata (repositories array should be empty and will ignore other flags).
 */
'org_metadata_only'?: boolean;

/**
 * Exclude related items from being returned in the response in order to improve performance of the request. The array can include any of: `"repositories"`.
 */
'exclude'?: Array<'repositories'>;
}
}

export function migrationsStartForOrg(http: HttpClient, rootUrl: string, params: MigrationsStartForOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<Migration>> {
  const rb = new RequestBuilder(rootUrl, migrationsStartForOrg.PATH, 'post');
  if (params) {
    rb.path('org', params.org, {});
    rb.body(params.body, 'application/json');
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Migration>;
    })
  );
}

migrationsStartForOrg.PATH = '/orgs/{org}/migrations';
