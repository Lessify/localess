/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { BaseService } from '../base-service';
import { ApiConfiguration } from '../api-configuration';
import { StrictHttpResponse } from '../strict-http-response';

import { BaseGist } from '../models/base-gist';
import { GistComment } from '../models/gist-comment';
import { GistCommit } from '../models/gist-commit';
import { GistSimple } from '../models/gist-simple';
import { gistsCheckIsStarred } from '../fn/gists/gists-check-is-starred';
import { GistsCheckIsStarred$Params } from '../fn/gists/gists-check-is-starred';
import { gistsCreate } from '../fn/gists/gists-create';
import { GistsCreate$Params } from '../fn/gists/gists-create';
import { gistsCreateComment } from '../fn/gists/gists-create-comment';
import { GistsCreateComment$Params } from '../fn/gists/gists-create-comment';
import { gistsDelete } from '../fn/gists/gists-delete';
import { GistsDelete$Params } from '../fn/gists/gists-delete';
import { gistsDeleteComment } from '../fn/gists/gists-delete-comment';
import { GistsDeleteComment$Params } from '../fn/gists/gists-delete-comment';
import { gistsFork } from '../fn/gists/gists-fork';
import { GistsFork$Params } from '../fn/gists/gists-fork';
import { gistsGet } from '../fn/gists/gists-get';
import { GistsGet$Params } from '../fn/gists/gists-get';
import { gistsGetComment } from '../fn/gists/gists-get-comment';
import { GistsGetComment$Params } from '../fn/gists/gists-get-comment';
import { gistsGetRevision } from '../fn/gists/gists-get-revision';
import { GistsGetRevision$Params } from '../fn/gists/gists-get-revision';
import { gistsList } from '../fn/gists/gists-list';
import { GistsList$Params } from '../fn/gists/gists-list';
import { gistsListComments } from '../fn/gists/gists-list-comments';
import { GistsListComments$Params } from '../fn/gists/gists-list-comments';
import { gistsListCommits } from '../fn/gists/gists-list-commits';
import { GistsListCommits$Params } from '../fn/gists/gists-list-commits';
import { gistsListForks } from '../fn/gists/gists-list-forks';
import { GistsListForks$Params } from '../fn/gists/gists-list-forks';
import { gistsListForUser } from '../fn/gists/gists-list-for-user';
import { GistsListForUser$Params } from '../fn/gists/gists-list-for-user';
import { gistsListPublic } from '../fn/gists/gists-list-public';
import { GistsListPublic$Params } from '../fn/gists/gists-list-public';
import { gistsListStarred } from '../fn/gists/gists-list-starred';
import { GistsListStarred$Params } from '../fn/gists/gists-list-starred';
import { gistsStar } from '../fn/gists/gists-star';
import { GistsStar$Params } from '../fn/gists/gists-star';
import { gistsUnstar } from '../fn/gists/gists-unstar';
import { GistsUnstar$Params } from '../fn/gists/gists-unstar';
import { gistsUpdate } from '../fn/gists/gists-update';
import { GistsUpdate$Params } from '../fn/gists/gists-update';
import { gistsUpdateComment } from '../fn/gists/gists-update-comment';
import { GistsUpdateComment$Params } from '../fn/gists/gists-update-comment';


/**
 * View, modify your gists.
 */
@Injectable({ providedIn: 'root' })
export class GistsService extends BaseService {
  constructor(config: ApiConfiguration, http: HttpClient) {
    super(config, http);
  }

  /** Path part for operation `gistsList()` */
  static readonly GistsListPath = '/gists';

  /**
   * List gists for the authenticated user.
   *
   * Lists the authenticated user's gists or if called anonymously, this endpoint returns all public gists:
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `gistsList()` instead.
   *
   * This method doesn't expect any request body.
   */
  gistsList$Response(params?: GistsList$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<BaseGist>>> {
    return gistsList(this.http, this.rootUrl, params, context);
  }

  /**
   * List gists for the authenticated user.
   *
   * Lists the authenticated user's gists or if called anonymously, this endpoint returns all public gists:
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `gistsList$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  gistsList(params?: GistsList$Params, context?: HttpContext): Observable<Array<BaseGist>> {
    return this.gistsList$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<BaseGist>>): Array<BaseGist> => r.body)
    );
  }

  /** Path part for operation `gistsCreate()` */
  static readonly GistsCreatePath = '/gists';

  /**
   * Create a gist.
   *
   * Allows you to add a new gist with one or more files.
   *
   * **Note:** Don't name your files "gistfile" with a numerical suffix. This is the format of the automatic naming scheme that Gist uses internally.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `gistsCreate()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  gistsCreate$Response(params: GistsCreate$Params, context?: HttpContext): Observable<StrictHttpResponse<GistSimple>> {
    return gistsCreate(this.http, this.rootUrl, params, context);
  }

  /**
   * Create a gist.
   *
   * Allows you to add a new gist with one or more files.
   *
   * **Note:** Don't name your files "gistfile" with a numerical suffix. This is the format of the automatic naming scheme that Gist uses internally.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `gistsCreate$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  gistsCreate(params: GistsCreate$Params, context?: HttpContext): Observable<GistSimple> {
    return this.gistsCreate$Response(params, context).pipe(
      map((r: StrictHttpResponse<GistSimple>): GistSimple => r.body)
    );
  }

  /** Path part for operation `gistsListPublic()` */
  static readonly GistsListPublicPath = '/gists/public';

  /**
   * List public gists.
   *
   * List public gists sorted by most recently updated to least recently updated.
   *
   * Note: With [pagination](https://docs.github.com/rest/overview/resources-in-the-rest-api#pagination), you can fetch up to 3000 gists. For example, you can fetch 100 pages with 30 gists per page or 30 pages with 100 gists per page.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `gistsListPublic()` instead.
   *
   * This method doesn't expect any request body.
   */
  gistsListPublic$Response(params?: GistsListPublic$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<BaseGist>>> {
    return gistsListPublic(this.http, this.rootUrl, params, context);
  }

  /**
   * List public gists.
   *
   * List public gists sorted by most recently updated to least recently updated.
   *
   * Note: With [pagination](https://docs.github.com/rest/overview/resources-in-the-rest-api#pagination), you can fetch up to 3000 gists. For example, you can fetch 100 pages with 30 gists per page or 30 pages with 100 gists per page.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `gistsListPublic$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  gistsListPublic(params?: GistsListPublic$Params, context?: HttpContext): Observable<Array<BaseGist>> {
    return this.gistsListPublic$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<BaseGist>>): Array<BaseGist> => r.body)
    );
  }

  /** Path part for operation `gistsListStarred()` */
  static readonly GistsListStarredPath = '/gists/starred';

  /**
   * List starred gists.
   *
   * List the authenticated user's starred gists:
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `gistsListStarred()` instead.
   *
   * This method doesn't expect any request body.
   */
  gistsListStarred$Response(params?: GistsListStarred$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<BaseGist>>> {
    return gistsListStarred(this.http, this.rootUrl, params, context);
  }

  /**
   * List starred gists.
   *
   * List the authenticated user's starred gists:
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `gistsListStarred$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  gistsListStarred(params?: GistsListStarred$Params, context?: HttpContext): Observable<Array<BaseGist>> {
    return this.gistsListStarred$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<BaseGist>>): Array<BaseGist> => r.body)
    );
  }

  /** Path part for operation `gistsGet()` */
  static readonly GistsGetPath = '/gists/{gist_id}';

  /**
   * Get a gist.
   *
   *
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `gistsGet()` instead.
   *
   * This method doesn't expect any request body.
   */
  gistsGet$Response(params: GistsGet$Params, context?: HttpContext): Observable<StrictHttpResponse<GistSimple>> {
    return gistsGet(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a gist.
   *
   *
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `gistsGet$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  gistsGet(params: GistsGet$Params, context?: HttpContext): Observable<GistSimple> {
    return this.gistsGet$Response(params, context).pipe(
      map((r: StrictHttpResponse<GistSimple>): GistSimple => r.body)
    );
  }

  /** Path part for operation `gistsDelete()` */
  static readonly GistsDeletePath = '/gists/{gist_id}';

  /**
   * Delete a gist.
   *
   *
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `gistsDelete()` instead.
   *
   * This method doesn't expect any request body.
   */
  gistsDelete$Response(params: GistsDelete$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return gistsDelete(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete a gist.
   *
   *
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `gistsDelete$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  gistsDelete(params: GistsDelete$Params, context?: HttpContext): Observable<void> {
    return this.gistsDelete$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `gistsUpdate()` */
  static readonly GistsUpdatePath = '/gists/{gist_id}';

  /**
   * Update a gist.
   *
   * Allows you to update a gist's description and to update, delete, or rename gist files. Files from the previous version of the gist that aren't explicitly changed during an edit are unchanged.
   * At least one of `description` or `files` is required.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `gistsUpdate()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  gistsUpdate$Response(params: GistsUpdate$Params, context?: HttpContext): Observable<StrictHttpResponse<GistSimple>> {
    return gistsUpdate(this.http, this.rootUrl, params, context);
  }

  /**
   * Update a gist.
   *
   * Allows you to update a gist's description and to update, delete, or rename gist files. Files from the previous version of the gist that aren't explicitly changed during an edit are unchanged.
   * At least one of `description` or `files` is required.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `gistsUpdate$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  gistsUpdate(params: GistsUpdate$Params, context?: HttpContext): Observable<GistSimple> {
    return this.gistsUpdate$Response(params, context).pipe(
      map((r: StrictHttpResponse<GistSimple>): GistSimple => r.body)
    );
  }

  /** Path part for operation `gistsListComments()` */
  static readonly GistsListCommentsPath = '/gists/{gist_id}/comments';

  /**
   * List gist comments.
   *
   *
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `gistsListComments()` instead.
   *
   * This method doesn't expect any request body.
   */
  gistsListComments$Response(params: GistsListComments$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<GistComment>>> {
    return gistsListComments(this.http, this.rootUrl, params, context);
  }

  /**
   * List gist comments.
   *
   *
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `gistsListComments$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  gistsListComments(params: GistsListComments$Params, context?: HttpContext): Observable<Array<GistComment>> {
    return this.gistsListComments$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<GistComment>>): Array<GistComment> => r.body)
    );
  }

  /** Path part for operation `gistsCreateComment()` */
  static readonly GistsCreateCommentPath = '/gists/{gist_id}/comments';

  /**
   * Create a gist comment.
   *
   *
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `gistsCreateComment()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  gistsCreateComment$Response(params: GistsCreateComment$Params, context?: HttpContext): Observable<StrictHttpResponse<GistComment>> {
    return gistsCreateComment(this.http, this.rootUrl, params, context);
  }

  /**
   * Create a gist comment.
   *
   *
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `gistsCreateComment$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  gistsCreateComment(params: GistsCreateComment$Params, context?: HttpContext): Observable<GistComment> {
    return this.gistsCreateComment$Response(params, context).pipe(
      map((r: StrictHttpResponse<GistComment>): GistComment => r.body)
    );
  }

  /** Path part for operation `gistsGetComment()` */
  static readonly GistsGetCommentPath = '/gists/{gist_id}/comments/{comment_id}';

  /**
   * Get a gist comment.
   *
   *
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `gistsGetComment()` instead.
   *
   * This method doesn't expect any request body.
   */
  gistsGetComment$Response(params: GistsGetComment$Params, context?: HttpContext): Observable<StrictHttpResponse<GistComment>> {
    return gistsGetComment(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a gist comment.
   *
   *
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `gistsGetComment$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  gistsGetComment(params: GistsGetComment$Params, context?: HttpContext): Observable<GistComment> {
    return this.gistsGetComment$Response(params, context).pipe(
      map((r: StrictHttpResponse<GistComment>): GistComment => r.body)
    );
  }

  /** Path part for operation `gistsDeleteComment()` */
  static readonly GistsDeleteCommentPath = '/gists/{gist_id}/comments/{comment_id}';

  /**
   * Delete a gist comment.
   *
   *
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `gistsDeleteComment()` instead.
   *
   * This method doesn't expect any request body.
   */
  gistsDeleteComment$Response(params: GistsDeleteComment$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return gistsDeleteComment(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete a gist comment.
   *
   *
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `gistsDeleteComment$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  gistsDeleteComment(params: GistsDeleteComment$Params, context?: HttpContext): Observable<void> {
    return this.gistsDeleteComment$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `gistsUpdateComment()` */
  static readonly GistsUpdateCommentPath = '/gists/{gist_id}/comments/{comment_id}';

  /**
   * Update a gist comment.
   *
   *
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `gistsUpdateComment()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  gistsUpdateComment$Response(params: GistsUpdateComment$Params, context?: HttpContext): Observable<StrictHttpResponse<GistComment>> {
    return gistsUpdateComment(this.http, this.rootUrl, params, context);
  }

  /**
   * Update a gist comment.
   *
   *
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `gistsUpdateComment$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  gistsUpdateComment(params: GistsUpdateComment$Params, context?: HttpContext): Observable<GistComment> {
    return this.gistsUpdateComment$Response(params, context).pipe(
      map((r: StrictHttpResponse<GistComment>): GistComment => r.body)
    );
  }

  /** Path part for operation `gistsListCommits()` */
  static readonly GistsListCommitsPath = '/gists/{gist_id}/commits';

  /**
   * List gist commits.
   *
   *
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `gistsListCommits()` instead.
   *
   * This method doesn't expect any request body.
   */
  gistsListCommits$Response(params: GistsListCommits$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<GistCommit>>> {
    return gistsListCommits(this.http, this.rootUrl, params, context);
  }

  /**
   * List gist commits.
   *
   *
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `gistsListCommits$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  gistsListCommits(params: GistsListCommits$Params, context?: HttpContext): Observable<Array<GistCommit>> {
    return this.gistsListCommits$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<GistCommit>>): Array<GistCommit> => r.body)
    );
  }

  /** Path part for operation `gistsListForks()` */
  static readonly GistsListForksPath = '/gists/{gist_id}/forks';

  /**
   * List gist forks.
   *
   *
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `gistsListForks()` instead.
   *
   * This method doesn't expect any request body.
   */
  gistsListForks$Response(params: GistsListForks$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<GistSimple>>> {
    return gistsListForks(this.http, this.rootUrl, params, context);
  }

  /**
   * List gist forks.
   *
   *
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `gistsListForks$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  gistsListForks(params: GistsListForks$Params, context?: HttpContext): Observable<Array<GistSimple>> {
    return this.gistsListForks$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<GistSimple>>): Array<GistSimple> => r.body)
    );
  }

  /** Path part for operation `gistsFork()` */
  static readonly GistsForkPath = '/gists/{gist_id}/forks';

  /**
   * Fork a gist.
   *
   *
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `gistsFork()` instead.
   *
   * This method doesn't expect any request body.
   */
  gistsFork$Response(params: GistsFork$Params, context?: HttpContext): Observable<StrictHttpResponse<BaseGist>> {
    return gistsFork(this.http, this.rootUrl, params, context);
  }

  /**
   * Fork a gist.
   *
   *
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `gistsFork$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  gistsFork(params: GistsFork$Params, context?: HttpContext): Observable<BaseGist> {
    return this.gistsFork$Response(params, context).pipe(
      map((r: StrictHttpResponse<BaseGist>): BaseGist => r.body)
    );
  }

  /** Path part for operation `gistsCheckIsStarred()` */
  static readonly GistsCheckIsStarredPath = '/gists/{gist_id}/star';

  /**
   * Check if a gist is starred.
   *
   *
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `gistsCheckIsStarred()` instead.
   *
   * This method doesn't expect any request body.
   */
  gistsCheckIsStarred$Response(params: GistsCheckIsStarred$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return gistsCheckIsStarred(this.http, this.rootUrl, params, context);
  }

  /**
   * Check if a gist is starred.
   *
   *
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `gistsCheckIsStarred$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  gistsCheckIsStarred(params: GistsCheckIsStarred$Params, context?: HttpContext): Observable<void> {
    return this.gistsCheckIsStarred$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `gistsStar()` */
  static readonly GistsStarPath = '/gists/{gist_id}/star';

  /**
   * Star a gist.
   *
   * Note that you'll need to set `Content-Length` to zero when calling out to this endpoint. For more information, see "[HTTP verbs](https://docs.github.com/rest/overview/resources-in-the-rest-api#http-verbs)."
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `gistsStar()` instead.
   *
   * This method doesn't expect any request body.
   */
  gistsStar$Response(params: GistsStar$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return gistsStar(this.http, this.rootUrl, params, context);
  }

  /**
   * Star a gist.
   *
   * Note that you'll need to set `Content-Length` to zero when calling out to this endpoint. For more information, see "[HTTP verbs](https://docs.github.com/rest/overview/resources-in-the-rest-api#http-verbs)."
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `gistsStar$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  gistsStar(params: GistsStar$Params, context?: HttpContext): Observable<void> {
    return this.gistsStar$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `gistsUnstar()` */
  static readonly GistsUnstarPath = '/gists/{gist_id}/star';

  /**
   * Unstar a gist.
   *
   *
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `gistsUnstar()` instead.
   *
   * This method doesn't expect any request body.
   */
  gistsUnstar$Response(params: GistsUnstar$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return gistsUnstar(this.http, this.rootUrl, params, context);
  }

  /**
   * Unstar a gist.
   *
   *
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `gistsUnstar$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  gistsUnstar(params: GistsUnstar$Params, context?: HttpContext): Observable<void> {
    return this.gistsUnstar$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `gistsGetRevision()` */
  static readonly GistsGetRevisionPath = '/gists/{gist_id}/{sha}';

  /**
   * Get a gist revision.
   *
   *
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `gistsGetRevision()` instead.
   *
   * This method doesn't expect any request body.
   */
  gistsGetRevision$Response(params: GistsGetRevision$Params, context?: HttpContext): Observable<StrictHttpResponse<GistSimple>> {
    return gistsGetRevision(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a gist revision.
   *
   *
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `gistsGetRevision$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  gistsGetRevision(params: GistsGetRevision$Params, context?: HttpContext): Observable<GistSimple> {
    return this.gistsGetRevision$Response(params, context).pipe(
      map((r: StrictHttpResponse<GistSimple>): GistSimple => r.body)
    );
  }

  /** Path part for operation `gistsListForUser()` */
  static readonly GistsListForUserPath = '/users/{username}/gists';

  /**
   * List gists for a user.
   *
   * Lists public gists for the specified user:
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `gistsListForUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  gistsListForUser$Response(params: GistsListForUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<BaseGist>>> {
    return gistsListForUser(this.http, this.rootUrl, params, context);
  }

  /**
   * List gists for a user.
   *
   * Lists public gists for the specified user:
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `gistsListForUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  gistsListForUser(params: GistsListForUser$Params, context?: HttpContext): Observable<Array<BaseGist>> {
    return this.gistsListForUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<BaseGist>>): Array<BaseGist> => r.body)
    );
  }

}
