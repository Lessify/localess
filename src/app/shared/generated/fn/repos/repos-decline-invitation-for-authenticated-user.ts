/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';


export interface ReposDeclineInvitationForAuthenticatedUser$Params {

/**
 * The unique identifier of the invitation.
 */
  invitation_id: number;
}

export function reposDeclineInvitationForAuthenticatedUser(http: HttpClient, rootUrl: string, params: ReposDeclineInvitationForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
  const rb = new RequestBuilder(rootUrl, reposDeclineInvitationForAuthenticatedUser.PATH, 'delete');
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

reposDeclineInvitationForAuthenticatedUser.PATH = '/user/repository_invitations/{invitation_id}';
