/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';


export interface ActionsCreateWorkflowDispatch$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

/**
 * The ID of the workflow. You can also pass the workflow file name as a string.
 */
  workflow_id: (number | string);
      body: {

/**
 * The git reference for the workflow. The reference can be a branch or tag name.
 */
'ref': string;

/**
 * Input keys and values configured in the workflow file. The maximum number of properties is 10. Any default properties configured in the workflow file will be used when `inputs` are omitted.
 */
'inputs'?: {
[key: string]: any;
};
}
}

export function actionsCreateWorkflowDispatch(http: HttpClient, rootUrl: string, params: ActionsCreateWorkflowDispatch$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
  const rb = new RequestBuilder(rootUrl, actionsCreateWorkflowDispatch.PATH, 'post');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('workflow_id', params.workflow_id, {});
    rb.body(params.body, 'application/json');
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

actionsCreateWorkflowDispatch.PATH = '/repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches';
