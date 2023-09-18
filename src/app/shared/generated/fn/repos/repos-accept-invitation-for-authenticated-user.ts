/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';


export interface ReposAcceptInvitationForAuthenticatedUser$Params {

/**
 * The unique identifier of the invitation.
 */
  invitation_id: number;
}

export function reposAcceptInvitationForAuthenticatedUser(http: HttpClient, rootUrl: string, params: ReposAcceptInvitationForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
  const rb = new RequestBuilder(rootUrl, reposAcceptInvitationForAuthenticatedUser.PATH, 'patch');
  if (params) {
    rb.path('invitation_id', params.invitation_id, {});
  }

  return http.request(
    rb.build({ responseType: 'text', accept: '*/*', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return (r as HttpResponse<any>).clone({ body: undefined }) as StrictHttpResponse<void>;
    })
  );
}

reposAcceptInvitationForAuthenticatedUser.PATH = '/user/repository_invitations/{invitation_id}';
