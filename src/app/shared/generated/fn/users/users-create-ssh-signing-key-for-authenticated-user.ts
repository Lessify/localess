/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { SshSigningKey } from '../../models/ssh-signing-key';

export interface UsersCreateSshSigningKeyForAuthenticatedUser$Params {
      body: {

/**
 * A descriptive name for the new key.
 */
'title'?: string;

/**
 * The public SSH key to add to your GitHub account. For more information, see "[Checking for existing SSH keys](https://docs.github.com/authentication/connecting-to-github-with-ssh/checking-for-existing-ssh-keys)."
 */
'key': string;
}
}

export function usersCreateSshSigningKeyForAuthenticatedUser(http: HttpClient, rootUrl: string, params: UsersCreateSshSigningKeyForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<SshSigningKey>> {
  const rb = new RequestBuilder(rootUrl, usersCreateSshSigningKeyForAuthenticatedUser.PATH, 'post');
  if (params) {
    rb.body(params.body, 'application/json');
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

usersCreateSshSigningKeyForAuthenticatedUser.PATH = '/user/ssh_signing_keys';
