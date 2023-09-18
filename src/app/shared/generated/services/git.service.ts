/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { BaseService } from '../base-service';
import { ApiConfiguration } from '../api-configuration';
import { StrictHttpResponse } from '../strict-http-response';

import { Blob } from '../models/blob';
import { GitCommit } from '../models/git-commit';
import { GitRef } from '../models/git-ref';
import { GitTag } from '../models/git-tag';
import { GitTree } from '../models/git-tree';
import { gitCreateBlob } from '../fn/git/git-create-blob';
import { GitCreateBlob$Params } from '../fn/git/git-create-blob';
import { gitCreateCommit } from '../fn/git/git-create-commit';
import { GitCreateCommit$Params } from '../fn/git/git-create-commit';
import { gitCreateRef } from '../fn/git/git-create-ref';
import { GitCreateRef$Params } from '../fn/git/git-create-ref';
import { gitCreateTag } from '../fn/git/git-create-tag';
import { GitCreateTag$Params } from '../fn/git/git-create-tag';
import { gitCreateTree } from '../fn/git/git-create-tree';
import { GitCreateTree$Params } from '../fn/git/git-create-tree';
import { gitDeleteRef } from '../fn/git/git-delete-ref';
import { GitDeleteRef$Params } from '../fn/git/git-delete-ref';
import { gitGetBlob } from '../fn/git/git-get-blob';
import { GitGetBlob$Params } from '../fn/git/git-get-blob';
import { gitGetCommit } from '../fn/git/git-get-commit';
import { GitGetCommit$Params } from '../fn/git/git-get-commit';
import { gitGetRef } from '../fn/git/git-get-ref';
import { GitGetRef$Params } from '../fn/git/git-get-ref';
import { gitGetTag } from '../fn/git/git-get-tag';
import { GitGetTag$Params } from '../fn/git/git-get-tag';
import { gitGetTree } from '../fn/git/git-get-tree';
import { GitGetTree$Params } from '../fn/git/git-get-tree';
import { gitListMatchingRefs } from '../fn/git/git-list-matching-refs';
import { GitListMatchingRefs$Params } from '../fn/git/git-list-matching-refs';
import { gitUpdateRef } from '../fn/git/git-update-ref';
import { GitUpdateRef$Params } from '../fn/git/git-update-ref';
import { ShortBlob } from '../models/short-blob';


/**
 * Raw Git functionality.
 */
@Injectable({ providedIn: 'root' })
export class GitService extends BaseService {
  constructor(config: ApiConfiguration, http: HttpClient) {
    super(config, http);
  }

  /** Path part for operation `gitCreateBlob()` */
  static readonly GitCreateBlobPath = '/repos/{owner}/{repo}/git/blobs';

  /**
   * Create a blob.
   *
   *
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `gitCreateBlob()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  gitCreateBlob$Response(params: GitCreateBlob$Params, context?: HttpContext): Observable<StrictHttpResponse<ShortBlob>> {
    return gitCreateBlob(this.http, this.rootUrl, params, context);
  }

  /**
   * Create a blob.
   *
   *
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `gitCreateBlob$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  gitCreateBlob(params: GitCreateBlob$Params, context?: HttpContext): Observable<ShortBlob> {
    return this.gitCreateBlob$Response(params, context).pipe(
      map((r: StrictHttpResponse<ShortBlob>): ShortBlob => r.body)
    );
  }

  /** Path part for operation `gitGetBlob()` */
  static readonly GitGetBlobPath = '/repos/{owner}/{repo}/git/blobs/{file_sha}';

  /**
   * Get a blob.
   *
   * The `content` in the response will always be Base64 encoded.
   *
   * _Note_: This API supports blobs up to 100 megabytes in size.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `gitGetBlob()` instead.
   *
   * This method doesn't expect any request body.
   */
  gitGetBlob$Response(params: GitGetBlob$Params, context?: HttpContext): Observable<StrictHttpResponse<Blob>> {
    return gitGetBlob(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a blob.
   *
   * The `content` in the response will always be Base64 encoded.
   *
   * _Note_: This API supports blobs up to 100 megabytes in size.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `gitGetBlob$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  gitGetBlob(params: GitGetBlob$Params, context?: HttpContext): Observable<Blob> {
    return this.gitGetBlob$Response(params, context).pipe(
      map((r: StrictHttpResponse<Blob>): Blob => r.body)
    );
  }

  /** Path part for operation `gitCreateCommit()` */
  static readonly GitCreateCommitPath = '/repos/{owner}/{repo}/git/commits';

  /**
   * Create a commit.
   *
   * Creates a new Git [commit object](https://git-scm.com/book/en/v2/Git-Internals-Git-Objects).
   *
   * **Signature verification object**
   *
   * The response will include a `verification` object that describes the result of verifying the commit's signature. The following fields are included in the `verification` object:
   *
   * | Name | Type | Description |
   * | ---- | ---- | ----------- |
   * | `verified` | `boolean` | Indicates whether GitHub considers the signature in this commit to be verified. |
   * | `reason` | `string` | The reason for verified value. Possible values and their meanings are enumerated in the table below. |
   * | `signature` | `string` | The signature that was extracted from the commit. |
   * | `payload` | `string` | The value that was signed. |
   *
   * These are the possible values for `reason` in the `verification` object:
   *
   * | Value | Description |
   * | ----- | ----------- |
   * | `expired_key` | The key that made the signature is expired. |
   * | `not_signing_key` | The "signing" flag is not among the usage flags in the GPG key that made the signature. |
   * | `gpgverify_error` | There was an error communicating with the signature verification service. |
   * | `gpgverify_unavailable` | The signature verification service is currently unavailable. |
   * | `unsigned` | The object does not include a signature. |
   * | `unknown_signature_type` | A non-PGP signature was found in the commit. |
   * | `no_user` | No user was associated with the `committer` email address in the commit. |
   * | `unverified_email` | The `committer` email address in the commit was associated with a user, but the email address is not verified on their account. |
   * | `bad_email` | The `committer` email address in the commit is not included in the identities of the PGP key that made the signature. |
   * | `unknown_key` | The key that made the signature has not been registered with any user's account. |
   * | `malformed_signature` | There was an error parsing the signature. |
   * | `invalid` | The signature could not be cryptographically verified using the key whose key-id was found in the signature. |
   * | `valid` | None of the above errors applied, so the signature is considered to be verified. |
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `gitCreateCommit()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  gitCreateCommit$Response(params: GitCreateCommit$Params, context?: HttpContext): Observable<StrictHttpResponse<GitCommit>> {
    return gitCreateCommit(this.http, this.rootUrl, params, context);
  }

  /**
   * Create a commit.
   *
   * Creates a new Git [commit object](https://git-scm.com/book/en/v2/Git-Internals-Git-Objects).
   *
   * **Signature verification object**
   *
   * The response will include a `verification` object that describes the result of verifying the commit's signature. The following fields are included in the `verification` object:
   *
   * | Name | Type | Description |
   * | ---- | ---- | ----------- |
   * | `verified` | `boolean` | Indicates whether GitHub considers the signature in this commit to be verified. |
   * | `reason` | `string` | The reason for verified value. Possible values and their meanings are enumerated in the table below. |
   * | `signature` | `string` | The signature that was extracted from the commit. |
   * | `payload` | `string` | The value that was signed. |
   *
   * These are the possible values for `reason` in the `verification` object:
   *
   * | Value | Description |
   * | ----- | ----------- |
   * | `expired_key` | The key that made the signature is expired. |
   * | `not_signing_key` | The "signing" flag is not among the usage flags in the GPG key that made the signature. |
   * | `gpgverify_error` | There was an error communicating with the signature verification service. |
   * | `gpgverify_unavailable` | The signature verification service is currently unavailable. |
   * | `unsigned` | The object does not include a signature. |
   * | `unknown_signature_type` | A non-PGP signature was found in the commit. |
   * | `no_user` | No user was associated with the `committer` email address in the commit. |
   * | `unverified_email` | The `committer` email address in the commit was associated with a user, but the email address is not verified on their account. |
   * | `bad_email` | The `committer` email address in the commit is not included in the identities of the PGP key that made the signature. |
   * | `unknown_key` | The key that made the signature has not been registered with any user's account. |
   * | `malformed_signature` | There was an error parsing the signature. |
   * | `invalid` | The signature could not be cryptographically verified using the key whose key-id was found in the signature. |
   * | `valid` | None of the above errors applied, so the signature is considered to be verified. |
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `gitCreateCommit$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  gitCreateCommit(params: GitCreateCommit$Params, context?: HttpContext): Observable<GitCommit> {
    return this.gitCreateCommit$Response(params, context).pipe(
      map((r: StrictHttpResponse<GitCommit>): GitCommit => r.body)
    );
  }

  /** Path part for operation `gitGetCommit()` */
  static readonly GitGetCommitPath = '/repos/{owner}/{repo}/git/commits/{commit_sha}';

  /**
   * Get a commit object.
   *
   * Gets a Git [commit object](https://git-scm.com/book/en/v2/Git-Internals-Git-Objects).
   *
   * To get the contents of a commit, see "[Get a commit](/rest/commits/commits#get-a-commit)."
   *
   * **Signature verification object**
   *
   * The response will include a `verification` object that describes the result of verifying the commit's signature. The following fields are included in the `verification` object:
   *
   * | Name | Type | Description |
   * | ---- | ---- | ----------- |
   * | `verified` | `boolean` | Indicates whether GitHub considers the signature in this commit to be verified. |
   * | `reason` | `string` | The reason for verified value. Possible values and their meanings are enumerated in the table below. |
   * | `signature` | `string` | The signature that was extracted from the commit. |
   * | `payload` | `string` | The value that was signed. |
   *
   * These are the possible values for `reason` in the `verification` object:
   *
   * | Value | Description |
   * | ----- | ----------- |
   * | `expired_key` | The key that made the signature is expired. |
   * | `not_signing_key` | The "signing" flag is not among the usage flags in the GPG key that made the signature. |
   * | `gpgverify_error` | There was an error communicating with the signature verification service. |
   * | `gpgverify_unavailable` | The signature verification service is currently unavailable. |
   * | `unsigned` | The object does not include a signature. |
   * | `unknown_signature_type` | A non-PGP signature was found in the commit. |
   * | `no_user` | No user was associated with the `committer` email address in the commit. |
   * | `unverified_email` | The `committer` email address in the commit was associated with a user, but the email address is not verified on their account. |
   * | `bad_email` | The `committer` email address in the commit is not included in the identities of the PGP key that made the signature. |
   * | `unknown_key` | The key that made the signature has not been registered with any user's account. |
   * | `malformed_signature` | There was an error parsing the signature. |
   * | `invalid` | The signature could not be cryptographically verified using the key whose key-id was found in the signature. |
   * | `valid` | None of the above errors applied, so the signature is considered to be verified. |
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `gitGetCommit()` instead.
   *
   * This method doesn't expect any request body.
   */
  gitGetCommit$Response(params: GitGetCommit$Params, context?: HttpContext): Observable<StrictHttpResponse<GitCommit>> {
    return gitGetCommit(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a commit object.
   *
   * Gets a Git [commit object](https://git-scm.com/book/en/v2/Git-Internals-Git-Objects).
   *
   * To get the contents of a commit, see "[Get a commit](/rest/commits/commits#get-a-commit)."
   *
   * **Signature verification object**
   *
   * The response will include a `verification` object that describes the result of verifying the commit's signature. The following fields are included in the `verification` object:
   *
   * | Name | Type | Description |
   * | ---- | ---- | ----------- |
   * | `verified` | `boolean` | Indicates whether GitHub considers the signature in this commit to be verified. |
   * | `reason` | `string` | The reason for verified value. Possible values and their meanings are enumerated in the table below. |
   * | `signature` | `string` | The signature that was extracted from the commit. |
   * | `payload` | `string` | The value that was signed. |
   *
   * These are the possible values for `reason` in the `verification` object:
   *
   * | Value | Description |
   * | ----- | ----------- |
   * | `expired_key` | The key that made the signature is expired. |
   * | `not_signing_key` | The "signing" flag is not among the usage flags in the GPG key that made the signature. |
   * | `gpgverify_error` | There was an error communicating with the signature verification service. |
   * | `gpgverify_unavailable` | The signature verification service is currently unavailable. |
   * | `unsigned` | The object does not include a signature. |
   * | `unknown_signature_type` | A non-PGP signature was found in the commit. |
   * | `no_user` | No user was associated with the `committer` email address in the commit. |
   * | `unverified_email` | The `committer` email address in the commit was associated with a user, but the email address is not verified on their account. |
   * | `bad_email` | The `committer` email address in the commit is not included in the identities of the PGP key that made the signature. |
   * | `unknown_key` | The key that made the signature has not been registered with any user's account. |
   * | `malformed_signature` | There was an error parsing the signature. |
   * | `invalid` | The signature could not be cryptographically verified using the key whose key-id was found in the signature. |
   * | `valid` | None of the above errors applied, so the signature is considered to be verified. |
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `gitGetCommit$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  gitGetCommit(params: GitGetCommit$Params, context?: HttpContext): Observable<GitCommit> {
    return this.gitGetCommit$Response(params, context).pipe(
      map((r: StrictHttpResponse<GitCommit>): GitCommit => r.body)
    );
  }

  /** Path part for operation `gitListMatchingRefs()` */
  static readonly GitListMatchingRefsPath = '/repos/{owner}/{repo}/git/matching-refs/{ref}';

  /**
   * List matching references.
   *
   * Returns an array of references from your Git database that match the supplied name. The `:ref` in the URL must be formatted as `heads/<branch name>` for branches and `tags/<tag name>` for tags. If the `:ref` doesn't exist in the repository, but existing refs start with `:ref`, they will be returned as an array.
   *
   * When you use this endpoint without providing a `:ref`, it will return an array of all the references from your Git database, including notes and stashes if they exist on the server. Anything in the namespace is returned, not just `heads` and `tags`.
   *
   * **Note:** You need to explicitly [request a pull request](https://docs.github.com/rest/pulls/pulls#get-a-pull-request) to trigger a test merge commit, which checks the mergeability of pull requests. For more information, see "[Checking mergeability of pull requests](https://docs.github.com/rest/guides/getting-started-with-the-git-database-api#checking-mergeability-of-pull-requests)".
   *
   * If you request matching references for a branch named `feature` but the branch `feature` doesn't exist, the response can still include other matching head refs that start with the word `feature`, such as `featureA` and `featureB`.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `gitListMatchingRefs()` instead.
   *
   * This method doesn't expect any request body.
   */
  gitListMatchingRefs$Response(params: GitListMatchingRefs$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<GitRef>>> {
    return gitListMatchingRefs(this.http, this.rootUrl, params, context);
  }

  /**
   * List matching references.
   *
   * Returns an array of references from your Git database that match the supplied name. The `:ref` in the URL must be formatted as `heads/<branch name>` for branches and `tags/<tag name>` for tags. If the `:ref` doesn't exist in the repository, but existing refs start with `:ref`, they will be returned as an array.
   *
   * When you use this endpoint without providing a `:ref`, it will return an array of all the references from your Git database, including notes and stashes if they exist on the server. Anything in the namespace is returned, not just `heads` and `tags`.
   *
   * **Note:** You need to explicitly [request a pull request](https://docs.github.com/rest/pulls/pulls#get-a-pull-request) to trigger a test merge commit, which checks the mergeability of pull requests. For more information, see "[Checking mergeability of pull requests](https://docs.github.com/rest/guides/getting-started-with-the-git-database-api#checking-mergeability-of-pull-requests)".
   *
   * If you request matching references for a branch named `feature` but the branch `feature` doesn't exist, the response can still include other matching head refs that start with the word `feature`, such as `featureA` and `featureB`.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `gitListMatchingRefs$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  gitListMatchingRefs(params: GitListMatchingRefs$Params, context?: HttpContext): Observable<Array<GitRef>> {
    return this.gitListMatchingRefs$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<GitRef>>): Array<GitRef> => r.body)
    );
  }

  /** Path part for operation `gitGetRef()` */
  static readonly GitGetRefPath = '/repos/{owner}/{repo}/git/ref/{ref}';

  /**
   * Get a reference.
   *
   * Returns a single reference from your Git database. The `:ref` in the URL must be formatted as `heads/<branch name>` for branches and `tags/<tag name>` for tags. If the `:ref` doesn't match an existing ref, a `404` is returned.
   *
   * **Note:** You need to explicitly [request a pull request](https://docs.github.com/rest/pulls/pulls#get-a-pull-request) to trigger a test merge commit, which checks the mergeability of pull requests. For more information, see "[Checking mergeability of pull requests](https://docs.github.com/rest/guides/getting-started-with-the-git-database-api#checking-mergeability-of-pull-requests)".
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `gitGetRef()` instead.
   *
   * This method doesn't expect any request body.
   */
  gitGetRef$Response(params: GitGetRef$Params, context?: HttpContext): Observable<StrictHttpResponse<GitRef>> {
    return gitGetRef(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a reference.
   *
   * Returns a single reference from your Git database. The `:ref` in the URL must be formatted as `heads/<branch name>` for branches and `tags/<tag name>` for tags. If the `:ref` doesn't match an existing ref, a `404` is returned.
   *
   * **Note:** You need to explicitly [request a pull request](https://docs.github.com/rest/pulls/pulls#get-a-pull-request) to trigger a test merge commit, which checks the mergeability of pull requests. For more information, see "[Checking mergeability of pull requests](https://docs.github.com/rest/guides/getting-started-with-the-git-database-api#checking-mergeability-of-pull-requests)".
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `gitGetRef$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  gitGetRef(params: GitGetRef$Params, context?: HttpContext): Observable<GitRef> {
    return this.gitGetRef$Response(params, context).pipe(
      map((r: StrictHttpResponse<GitRef>): GitRef => r.body)
    );
  }

  /** Path part for operation `gitCreateRef()` */
  static readonly GitCreateRefPath = '/repos/{owner}/{repo}/git/refs';

  /**
   * Create a reference.
   *
   * Creates a reference for your repository. You are unable to create new references for empty repositories, even if the commit SHA-1 hash used exists. Empty repositories are repositories without branches.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `gitCreateRef()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  gitCreateRef$Response(params: GitCreateRef$Params, context?: HttpContext): Observable<StrictHttpResponse<GitRef>> {
    return gitCreateRef(this.http, this.rootUrl, params, context);
  }

  /**
   * Create a reference.
   *
   * Creates a reference for your repository. You are unable to create new references for empty repositories, even if the commit SHA-1 hash used exists. Empty repositories are repositories without branches.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `gitCreateRef$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  gitCreateRef(params: GitCreateRef$Params, context?: HttpContext): Observable<GitRef> {
    return this.gitCreateRef$Response(params, context).pipe(
      map((r: StrictHttpResponse<GitRef>): GitRef => r.body)
    );
  }

  /** Path part for operation `gitDeleteRef()` */
  static readonly GitDeleteRefPath = '/repos/{owner}/{repo}/git/refs/{ref}';

  /**
   * Delete a reference.
   *
   *
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `gitDeleteRef()` instead.
   *
   * This method doesn't expect any request body.
   */
  gitDeleteRef$Response(params: GitDeleteRef$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return gitDeleteRef(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete a reference.
   *
   *
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `gitDeleteRef$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  gitDeleteRef(params: GitDeleteRef$Params, context?: HttpContext): Observable<void> {
    return this.gitDeleteRef$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `gitUpdateRef()` */
  static readonly GitUpdateRefPath = '/repos/{owner}/{repo}/git/refs/{ref}';

  /**
   * Update a reference.
   *
   *
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `gitUpdateRef()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  gitUpdateRef$Response(params: GitUpdateRef$Params, context?: HttpContext): Observable<StrictHttpResponse<GitRef>> {
    return gitUpdateRef(this.http, this.rootUrl, params, context);
  }

  /**
   * Update a reference.
   *
   *
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `gitUpdateRef$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  gitUpdateRef(params: GitUpdateRef$Params, context?: HttpContext): Observable<GitRef> {
    return this.gitUpdateRef$Response(params, context).pipe(
      map((r: StrictHttpResponse<GitRef>): GitRef => r.body)
    );
  }

  /** Path part for operation `gitCreateTag()` */
  static readonly GitCreateTagPath = '/repos/{owner}/{repo}/git/tags';

  /**
   * Create a tag object.
   *
   * Note that creating a tag object does not create the reference that makes a tag in Git. If you want to create an annotated tag in Git, you have to do this call to create the tag object, and then [create](https://docs.github.com/rest/git/refs#create-a-reference) the `refs/tags/[tag]` reference. If you want to create a lightweight tag, you only have to [create](https://docs.github.com/rest/git/refs#create-a-reference) the tag reference - this call would be unnecessary.
   *
   * **Signature verification object**
   *
   * The response will include a `verification` object that describes the result of verifying the commit's signature. The following fields are included in the `verification` object:
   *
   * | Name | Type | Description |
   * | ---- | ---- | ----------- |
   * | `verified` | `boolean` | Indicates whether GitHub considers the signature in this commit to be verified. |
   * | `reason` | `string` | The reason for verified value. Possible values and their meanings are enumerated in table below. |
   * | `signature` | `string` | The signature that was extracted from the commit. |
   * | `payload` | `string` | The value that was signed. |
   *
   * These are the possible values for `reason` in the `verification` object:
   *
   * | Value | Description |
   * | ----- | ----------- |
   * | `expired_key` | The key that made the signature is expired. |
   * | `not_signing_key` | The "signing" flag is not among the usage flags in the GPG key that made the signature. |
   * | `gpgverify_error` | There was an error communicating with the signature verification service. |
   * | `gpgverify_unavailable` | The signature verification service is currently unavailable. |
   * | `unsigned` | The object does not include a signature. |
   * | `unknown_signature_type` | A non-PGP signature was found in the commit. |
   * | `no_user` | No user was associated with the `committer` email address in the commit. |
   * | `unverified_email` | The `committer` email address in the commit was associated with a user, but the email address is not verified on their account. |
   * | `bad_email` | The `committer` email address in the commit is not included in the identities of the PGP key that made the signature. |
   * | `unknown_key` | The key that made the signature has not been registered with any user's account. |
   * | `malformed_signature` | There was an error parsing the signature. |
   * | `invalid` | The signature could not be cryptographically verified using the key whose key-id was found in the signature. |
   * | `valid` | None of the above errors applied, so the signature is considered to be verified. |
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `gitCreateTag()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  gitCreateTag$Response(params: GitCreateTag$Params, context?: HttpContext): Observable<StrictHttpResponse<GitTag>> {
    return gitCreateTag(this.http, this.rootUrl, params, context);
  }

  /**
   * Create a tag object.
   *
   * Note that creating a tag object does not create the reference that makes a tag in Git. If you want to create an annotated tag in Git, you have to do this call to create the tag object, and then [create](https://docs.github.com/rest/git/refs#create-a-reference) the `refs/tags/[tag]` reference. If you want to create a lightweight tag, you only have to [create](https://docs.github.com/rest/git/refs#create-a-reference) the tag reference - this call would be unnecessary.
   *
   * **Signature verification object**
   *
   * The response will include a `verification` object that describes the result of verifying the commit's signature. The following fields are included in the `verification` object:
   *
   * | Name | Type | Description |
   * | ---- | ---- | ----------- |
   * | `verified` | `boolean` | Indicates whether GitHub considers the signature in this commit to be verified. |
   * | `reason` | `string` | The reason for verified value. Possible values and their meanings are enumerated in table below. |
   * | `signature` | `string` | The signature that was extracted from the commit. |
   * | `payload` | `string` | The value that was signed. |
   *
   * These are the possible values for `reason` in the `verification` object:
   *
   * | Value | Description |
   * | ----- | ----------- |
   * | `expired_key` | The key that made the signature is expired. |
   * | `not_signing_key` | The "signing" flag is not among the usage flags in the GPG key that made the signature. |
   * | `gpgverify_error` | There was an error communicating with the signature verification service. |
   * | `gpgverify_unavailable` | The signature verification service is currently unavailable. |
   * | `unsigned` | The object does not include a signature. |
   * | `unknown_signature_type` | A non-PGP signature was found in the commit. |
   * | `no_user` | No user was associated with the `committer` email address in the commit. |
   * | `unverified_email` | The `committer` email address in the commit was associated with a user, but the email address is not verified on their account. |
   * | `bad_email` | The `committer` email address in the commit is not included in the identities of the PGP key that made the signature. |
   * | `unknown_key` | The key that made the signature has not been registered with any user's account. |
   * | `malformed_signature` | There was an error parsing the signature. |
   * | `invalid` | The signature could not be cryptographically verified using the key whose key-id was found in the signature. |
   * | `valid` | None of the above errors applied, so the signature is considered to be verified. |
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `gitCreateTag$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  gitCreateTag(params: GitCreateTag$Params, context?: HttpContext): Observable<GitTag> {
    return this.gitCreateTag$Response(params, context).pipe(
      map((r: StrictHttpResponse<GitTag>): GitTag => r.body)
    );
  }

  /** Path part for operation `gitGetTag()` */
  static readonly GitGetTagPath = '/repos/{owner}/{repo}/git/tags/{tag_sha}';

  /**
   * Get a tag.
   *
   * **Signature verification object**
   *
   * The response will include a `verification` object that describes the result of verifying the commit's signature. The following fields are included in the `verification` object:
   *
   * | Name | Type | Description |
   * | ---- | ---- | ----------- |
   * | `verified` | `boolean` | Indicates whether GitHub considers the signature in this commit to be verified. |
   * | `reason` | `string` | The reason for verified value. Possible values and their meanings are enumerated in table below. |
   * | `signature` | `string` | The signature that was extracted from the commit. |
   * | `payload` | `string` | The value that was signed. |
   *
   * These are the possible values for `reason` in the `verification` object:
   *
   * | Value | Description |
   * | ----- | ----------- |
   * | `expired_key` | The key that made the signature is expired. |
   * | `not_signing_key` | The "signing" flag is not among the usage flags in the GPG key that made the signature. |
   * | `gpgverify_error` | There was an error communicating with the signature verification service. |
   * | `gpgverify_unavailable` | The signature verification service is currently unavailable. |
   * | `unsigned` | The object does not include a signature. |
   * | `unknown_signature_type` | A non-PGP signature was found in the commit. |
   * | `no_user` | No user was associated with the `committer` email address in the commit. |
   * | `unverified_email` | The `committer` email address in the commit was associated with a user, but the email address is not verified on their account. |
   * | `bad_email` | The `committer` email address in the commit is not included in the identities of the PGP key that made the signature. |
   * | `unknown_key` | The key that made the signature has not been registered with any user's account. |
   * | `malformed_signature` | There was an error parsing the signature. |
   * | `invalid` | The signature could not be cryptographically verified using the key whose key-id was found in the signature. |
   * | `valid` | None of the above errors applied, so the signature is considered to be verified. |
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `gitGetTag()` instead.
   *
   * This method doesn't expect any request body.
   */
  gitGetTag$Response(params: GitGetTag$Params, context?: HttpContext): Observable<StrictHttpResponse<GitTag>> {
    return gitGetTag(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a tag.
   *
   * **Signature verification object**
   *
   * The response will include a `verification` object that describes the result of verifying the commit's signature. The following fields are included in the `verification` object:
   *
   * | Name | Type | Description |
   * | ---- | ---- | ----------- |
   * | `verified` | `boolean` | Indicates whether GitHub considers the signature in this commit to be verified. |
   * | `reason` | `string` | The reason for verified value. Possible values and their meanings are enumerated in table below. |
   * | `signature` | `string` | The signature that was extracted from the commit. |
   * | `payload` | `string` | The value that was signed. |
   *
   * These are the possible values for `reason` in the `verification` object:
   *
   * | Value | Description |
   * | ----- | ----------- |
   * | `expired_key` | The key that made the signature is expired. |
   * | `not_signing_key` | The "signing" flag is not among the usage flags in the GPG key that made the signature. |
   * | `gpgverify_error` | There was an error communicating with the signature verification service. |
   * | `gpgverify_unavailable` | The signature verification service is currently unavailable. |
   * | `unsigned` | The object does not include a signature. |
   * | `unknown_signature_type` | A non-PGP signature was found in the commit. |
   * | `no_user` | No user was associated with the `committer` email address in the commit. |
   * | `unverified_email` | The `committer` email address in the commit was associated with a user, but the email address is not verified on their account. |
   * | `bad_email` | The `committer` email address in the commit is not included in the identities of the PGP key that made the signature. |
   * | `unknown_key` | The key that made the signature has not been registered with any user's account. |
   * | `malformed_signature` | There was an error parsing the signature. |
   * | `invalid` | The signature could not be cryptographically verified using the key whose key-id was found in the signature. |
   * | `valid` | None of the above errors applied, so the signature is considered to be verified. |
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `gitGetTag$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  gitGetTag(params: GitGetTag$Params, context?: HttpContext): Observable<GitTag> {
    return this.gitGetTag$Response(params, context).pipe(
      map((r: StrictHttpResponse<GitTag>): GitTag => r.body)
    );
  }

  /** Path part for operation `gitCreateTree()` */
  static readonly GitCreateTreePath = '/repos/{owner}/{repo}/git/trees';

  /**
   * Create a tree.
   *
   * The tree creation API accepts nested entries. If you specify both a tree and a nested path modifying that tree, this endpoint will overwrite the contents of the tree with the new path contents, and create a new tree structure.
   *
   * If you use this endpoint to add, delete, or modify the file contents in a tree, you will need to commit the tree and then update a branch to point to the commit. For more information see "[Create a commit](https://docs.github.com/rest/git/commits#create-a-commit)" and "[Update a reference](https://docs.github.com/rest/git/refs#update-a-reference)."
   *
   * Returns an error if you try to delete a file that does not exist.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `gitCreateTree()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  gitCreateTree$Response(params: GitCreateTree$Params, context?: HttpContext): Observable<StrictHttpResponse<GitTree>> {
    return gitCreateTree(this.http, this.rootUrl, params, context);
  }

  /**
   * Create a tree.
   *
   * The tree creation API accepts nested entries. If you specify both a tree and a nested path modifying that tree, this endpoint will overwrite the contents of the tree with the new path contents, and create a new tree structure.
   *
   * If you use this endpoint to add, delete, or modify the file contents in a tree, you will need to commit the tree and then update a branch to point to the commit. For more information see "[Create a commit](https://docs.github.com/rest/git/commits#create-a-commit)" and "[Update a reference](https://docs.github.com/rest/git/refs#update-a-reference)."
   *
   * Returns an error if you try to delete a file that does not exist.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `gitCreateTree$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  gitCreateTree(params: GitCreateTree$Params, context?: HttpContext): Observable<GitTree> {
    return this.gitCreateTree$Response(params, context).pipe(
      map((r: StrictHttpResponse<GitTree>): GitTree => r.body)
    );
  }

  /** Path part for operation `gitGetTree()` */
  static readonly GitGetTreePath = '/repos/{owner}/{repo}/git/trees/{tree_sha}';

  /**
   * Get a tree.
   *
   * Returns a single tree using the SHA1 value or ref name for that tree.
   *
   * If `truncated` is `true` in the response then the number of items in the `tree` array exceeded our maximum limit. If you need to fetch more items, use the non-recursive method of fetching trees, and fetch one sub-tree at a time.
   *
   *
   * **Note**: The limit for the `tree` array is 100,000 entries with a maximum size of 7 MB when using the `recursive` parameter.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `gitGetTree()` instead.
   *
   * This method doesn't expect any request body.
   */
  gitGetTree$Response(params: GitGetTree$Params, context?: HttpContext): Observable<StrictHttpResponse<GitTree>> {
    return gitGetTree(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a tree.
   *
   * Returns a single tree using the SHA1 value or ref name for that tree.
   *
   * If `truncated` is `true` in the response then the number of items in the `tree` array exceeded our maximum limit. If you need to fetch more items, use the non-recursive method of fetching trees, and fetch one sub-tree at a time.
   *
   *
   * **Note**: The limit for the `tree` array is 100,000 entries with a maximum size of 7 MB when using the `recursive` parameter.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `gitGetTree$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  gitGetTree(params: GitGetTree$Params, context?: HttpContext): Observable<GitTree> {
    return this.gitGetTree$Response(params, context).pipe(
      map((r: StrictHttpResponse<GitTree>): GitTree => r.body)
    );
  }

}
