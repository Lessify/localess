/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Migration } from '../../models/migration';

export interface MigrationsStartForAuthenticatedUser$Params {
      body: {

/**
 * Lock the repositories being migrated at the start of the migration
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
 * Do not include attachments in the migration
 */
'exclude_attachments'?: boolean;

/**
 * Do not include releases in the migration
 */
'exclude_releases'?: boolean;

/**
 * Indicates whether projects owned by the organization or users should be excluded.
 */
'exclude_owner_projects'?: boolean;

/**
 * Indicates whether this should only include organization metadata (repositories array should be empty and will ignore other flags).
 */
'org_metadata_only'?: boolean;

/**
 * Exclude attributes from the API response to improve performance
 */
'exclude'?: Array<'repositories'>;
'repositories': Array<string>;
}
}

export function migrationsStartForAuthenticatedUser(http: HttpClient, rootUrl: string, params: MigrationsStartForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Migration>> {
  const rb = new RequestBuilder(rootUrl, migrationsStartForAuthenticatedUser.PATH, 'post');
  if (params) {
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

migrationsStartForAuthenticatedUser.PATH = '/user/migrations';
