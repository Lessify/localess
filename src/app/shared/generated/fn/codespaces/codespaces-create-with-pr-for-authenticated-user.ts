/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Codespace } from '../../models/codespace';

export interface CodespacesCreateWithPrForAuthenticatedUser$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

/**
 * The number that identifies the pull request.
 */
  pull_number: number;
      body: {

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
}
}

export function codespacesCreateWithPrForAuthenticatedUser(http: HttpClient, rootUrl: string, params: CodespacesCreateWithPrForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Codespace>> {
  const rb = new RequestBuilder(rootUrl, codespacesCreateWithPrForAuthenticatedUser.PATH, 'post');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('pull_number', params.pull_number, {});
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

codespacesCreateWithPrForAuthenticatedUser.PATH = '/repos/{owner}/{repo}/pulls/{pull_number}/codespaces';
