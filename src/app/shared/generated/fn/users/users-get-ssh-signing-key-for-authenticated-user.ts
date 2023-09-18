/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { SshSigningKey } from '../../models/ssh-signing-key';

export interface UsersGetSshSigningKeyForAuthenticatedUser$Params {

/**
 * The unique identifier of the SSH signing key.
 */
  ssh_signing_key_id: number;
}

export function usersGetSshSigningKeyForAuthenticatedUser(http: HttpClient, rootUrl: string, params: UsersGetSshSigningKeyForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<SshSigningKey>> {
  const rb = new RequestBuilder(rootUrl, usersGetSshSigningKeyForAuthenticatedUser.PATH, 'get');
  if (params) {
    rb.path('ssh_signing_key_id', params.ssh_signing_key_id, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<SshSigningKey>;
    })
  );
}

usersGetSshSigningKeyForAuthenticatedUser.PATH = '/user/ssh_signing_keys/{ssh_signing_key_id}';
