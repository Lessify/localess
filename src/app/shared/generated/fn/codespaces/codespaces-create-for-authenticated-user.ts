/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Codespace } from '../../models/codespace';

export interface CodespacesCreateForAuthenticatedUser$Params {
      body: ({

/**
 * Repository id for this codespace
 */
'repository_id': number;

/**
 * Git ref (typically a branch name) for this codespace
 */
'ref'?: string;

/**
 * The requested location for a new codespace. Best efforts are made to respect this upon creation. Assigned by IP if not provided.
 */
'location'?: string;

/**
 * The geographic area for this codespace. If not specified, the value is assigned by IP. This property replaces `location`, which is being deprecated.
 */
'geo'?: 'EuropeWest' | 'SoutheastAsia' | 'UsEast' | 'UsWest';

/**
 * IP for location auto-detection when proxying a request
 */
'client_ip'?: string;

/**
 * Machine type to use for this codespace
 */
'machine'?: string;

/**
 * Path to devcontainer.json config to use for this codespace
 */
'devcontainer_path'?: string;

/**
 * Whether to authorize requested permissions from devcontainer.json
 */
'multi_repo_permissions_opt_out'?: boolean;

/**
 * Working directory for this codespace
 */
'working_directory'?: string;

/**
 * Time in minutes before codespace stops from inactivity
 */
'idle_timeout_minutes'?: number;

/**
 * Display name for this codespace
 */
'display_name'?: string;

/**
 * Duration in minutes after codespace has gone idle in which it will be deleted. Must be integer minutes between 0 and 43200 (30 days).
 */
'retention_period_minutes'?: number;
} | {

/**
 * Pull request number for this codespace
 */
'pull_request': {

/**
 * Pull request number
 */
'pull_request_number': number;

/**
 * Repository id for this codespace
 */
'repository_id': number;
};

/**
 * The requested location for a new codespace. Best efforts are made to respect this upon creation. Assigned by IP if not provided.
 */
'location'?: string;

/**
 * The geographic area for this codespace. If not specified, the value is assigned by IP. This property replaces `location`, which is being deprecated.
 */
'geo'?: 'EuropeWest' | 'SoutheastAsia' | 'UsEast' | 'UsWest';

/**
 * Machine type to use for this codespace
 */
'machine'?: string;

/**
 * Path to devcontainer.json config to use for this codespace
 */
'devcontainer_path'?: string;

/**
 * Working directory for this codespace
 */
'working_directory'?: string;

/**
 * Time in minutes before codespace stops from inactivity
 */
'idle_timeout_minutes'?: number;
})
}

export function codespacesCreateForAuthenticatedUser(http: HttpClient, rootUrl: string, params: CodespacesCreateForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Codespace>> {
  const rb = new RequestBuilder(rootUrl, codespacesCreateForAuthenticatedUser.PATH, 'post');
  if (params) {
    rb.body(params.body, 'application/json');
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Codespace>;
    })
  );
}

codespacesCreateForAuthenticatedUser.PATH = '/user/codespaces';
