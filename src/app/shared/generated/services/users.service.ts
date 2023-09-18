/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { BaseService } from '../base-service';
import { ApiConfiguration } from '../api-configuration';
import { StrictHttpResponse } from '../strict-http-response';

import { Email } from '../models/email';
import { GpgKey } from '../models/gpg-key';
import { Hovercard } from '../models/hovercard';
import { Key } from '../models/key';
import { KeySimple } from '../models/key-simple';
import { PrivateUser } from '../models/private-user';
import { PublicUser } from '../models/public-user';
import { SimpleUser } from '../models/simple-user';
import { SocialAccount } from '../models/social-account';
import { SshSigningKey } from '../models/ssh-signing-key';
import { usersAddEmailForAuthenticatedUser } from '../fn/users/users-add-email-for-authenticated-user';
import { UsersAddEmailForAuthenticatedUser$Params } from '../fn/users/users-add-email-for-authenticated-user';
import { usersAddSocialAccountForAuthenticatedUser } from '../fn/users/users-add-social-account-for-authenticated-user';
import { UsersAddSocialAccountForAuthenticatedUser$Params } from '../fn/users/users-add-social-account-for-authenticated-user';
import { usersBlock } from '../fn/users/users-block';
import { UsersBlock$Params } from '../fn/users/users-block';
import { usersCheckBlocked } from '../fn/users/users-check-blocked';
import { UsersCheckBlocked$Params } from '../fn/users/users-check-blocked';
import { usersCheckFollowingForUser } from '../fn/users/users-check-following-for-user';
import { UsersCheckFollowingForUser$Params } from '../fn/users/users-check-following-for-user';
import { usersCheckPersonIsFollowedByAuthenticated } from '../fn/users/users-check-person-is-followed-by-authenticated';
import { UsersCheckPersonIsFollowedByAuthenticated$Params } from '../fn/users/users-check-person-is-followed-by-authenticated';
import { usersCreateGpgKeyForAuthenticatedUser } from '../fn/users/users-create-gpg-key-for-authenticated-user';
import { UsersCreateGpgKeyForAuthenticatedUser$Params } from '../fn/users/users-create-gpg-key-for-authenticated-user';
import { usersCreatePublicSshKeyForAuthenticatedUser } from '../fn/users/users-create-public-ssh-key-for-authenticated-user';
import { UsersCreatePublicSshKeyForAuthenticatedUser$Params } from '../fn/users/users-create-public-ssh-key-for-authenticated-user';
import { usersCreateSshSigningKeyForAuthenticatedUser } from '../fn/users/users-create-ssh-signing-key-for-authenticated-user';
import { UsersCreateSshSigningKeyForAuthenticatedUser$Params } from '../fn/users/users-create-ssh-signing-key-for-authenticated-user';
import { usersDeleteEmailForAuthenticatedUser } from '../fn/users/users-delete-email-for-authenticated-user';
import { UsersDeleteEmailForAuthenticatedUser$Params } from '../fn/users/users-delete-email-for-authenticated-user';
import { usersDeleteGpgKeyForAuthenticatedUser } from '../fn/users/users-delete-gpg-key-for-authenticated-user';
import { UsersDeleteGpgKeyForAuthenticatedUser$Params } from '../fn/users/users-delete-gpg-key-for-authenticated-user';
import { usersDeletePublicSshKeyForAuthenticatedUser } from '../fn/users/users-delete-public-ssh-key-for-authenticated-user';
import { UsersDeletePublicSshKeyForAuthenticatedUser$Params } from '../fn/users/users-delete-public-ssh-key-for-authenticated-user';
import { usersDeleteSocialAccountForAuthenticatedUser } from '../fn/users/users-delete-social-account-for-authenticated-user';
import { UsersDeleteSocialAccountForAuthenticatedUser$Params } from '../fn/users/users-delete-social-account-for-authenticated-user';
import { usersDeleteSshSigningKeyForAuthenticatedUser } from '../fn/users/users-delete-ssh-signing-key-for-authenticated-user';
import { UsersDeleteSshSigningKeyForAuthenticatedUser$Params } from '../fn/users/users-delete-ssh-signing-key-for-authenticated-user';
import { usersFollow } from '../fn/users/users-follow';
import { UsersFollow$Params } from '../fn/users/users-follow';
import { usersGetAuthenticated } from '../fn/users/users-get-authenticated';
import { UsersGetAuthenticated$Params } from '../fn/users/users-get-authenticated';
import { usersGetByUsername } from '../fn/users/users-get-by-username';
import { UsersGetByUsername$Params } from '../fn/users/users-get-by-username';
import { usersGetContextForUser } from '../fn/users/users-get-context-for-user';
import { UsersGetContextForUser$Params } from '../fn/users/users-get-context-for-user';
import { usersGetGpgKeyForAuthenticatedUser } from '../fn/users/users-get-gpg-key-for-authenticated-user';
import { UsersGetGpgKeyForAuthenticatedUser$Params } from '../fn/users/users-get-gpg-key-for-authenticated-user';
import { usersGetPublicSshKeyForAuthenticatedUser } from '../fn/users/users-get-public-ssh-key-for-authenticated-user';
import { UsersGetPublicSshKeyForAuthenticatedUser$Params } from '../fn/users/users-get-public-ssh-key-for-authenticated-user';
import { usersGetSshSigningKeyForAuthenticatedUser } from '../fn/users/users-get-ssh-signing-key-for-authenticated-user';
import { UsersGetSshSigningKeyForAuthenticatedUser$Params } from '../fn/users/users-get-ssh-signing-key-for-authenticated-user';
import { usersList } from '../fn/users/users-list';
import { UsersList$Params } from '../fn/users/users-list';
import { usersListBlockedByAuthenticatedUser } from '../fn/users/users-list-blocked-by-authenticated-user';
import { UsersListBlockedByAuthenticatedUser$Params } from '../fn/users/users-list-blocked-by-authenticated-user';
import { usersListEmailsForAuthenticatedUser } from '../fn/users/users-list-emails-for-authenticated-user';
import { UsersListEmailsForAuthenticatedUser$Params } from '../fn/users/users-list-emails-for-authenticated-user';
import { usersListFollowedByAuthenticatedUser } from '../fn/users/users-list-followed-by-authenticated-user';
import { UsersListFollowedByAuthenticatedUser$Params } from '../fn/users/users-list-followed-by-authenticated-user';
import { usersListFollowersForAuthenticatedUser } from '../fn/users/users-list-followers-for-authenticated-user';
import { UsersListFollowersForAuthenticatedUser$Params } from '../fn/users/users-list-followers-for-authenticated-user';
import { usersListFollowersForUser } from '../fn/users/users-list-followers-for-user';
import { UsersListFollowersForUser$Params } from '../fn/users/users-list-followers-for-user';
import { usersListFollowingForUser } from '../fn/users/users-list-following-for-user';
import { UsersListFollowingForUser$Params } from '../fn/users/users-list-following-for-user';
import { usersListGpgKeysForAuthenticatedUser } from '../fn/users/users-list-gpg-keys-for-authenticated-user';
import { UsersListGpgKeysForAuthenticatedUser$Params } from '../fn/users/users-list-gpg-keys-for-authenticated-user';
import { usersListGpgKeysForUser } from '../fn/users/users-list-gpg-keys-for-user';
import { UsersListGpgKeysForUser$Params } from '../fn/users/users-list-gpg-keys-for-user';
import { usersListPublicEmailsForAuthenticatedUser } from '../fn/users/users-list-public-emails-for-authenticated-user';
import { UsersListPublicEmailsForAuthenticatedUser$Params } from '../fn/users/users-list-public-emails-for-authenticated-user';
import { usersListPublicKeysForUser } from '../fn/users/users-list-public-keys-for-user';
import { UsersListPublicKeysForUser$Params } from '../fn/users/users-list-public-keys-for-user';
import { usersListPublicSshKeysForAuthenticatedUser } from '../fn/users/users-list-public-ssh-keys-for-authenticated-user';
import { UsersListPublicSshKeysForAuthenticatedUser$Params } from '../fn/users/users-list-public-ssh-keys-for-authenticated-user';
import { usersListSocialAccountsForAuthenticatedUser } from '../fn/users/users-list-social-accounts-for-authenticated-user';
import { UsersListSocialAccountsForAuthenticatedUser$Params } from '../fn/users/users-list-social-accounts-for-authenticated-user';
import { usersListSocialAccountsForUser } from '../fn/users/users-list-social-accounts-for-user';
import { UsersListSocialAccountsForUser$Params } from '../fn/users/users-list-social-accounts-for-user';
import { usersListSshSigningKeysForAuthenticatedUser } from '../fn/users/users-list-ssh-signing-keys-for-authenticated-user';
import { UsersListSshSigningKeysForAuthenticatedUser$Params } from '../fn/users/users-list-ssh-signing-keys-for-authenticated-user';
import { usersListSshSigningKeysForUser } from '../fn/users/users-list-ssh-signing-keys-for-user';
import { UsersListSshSigningKeysForUser$Params } from '../fn/users/users-list-ssh-signing-keys-for-user';
import { usersSetPrimaryEmailVisibilityForAuthenticatedUser } from '../fn/users/users-set-primary-email-visibility-for-authenticated-user';
import { UsersSetPrimaryEmailVisibilityForAuthenticatedUser$Params } from '../fn/users/users-set-primary-email-visibility-for-authenticated-user';
import { usersUnblock } from '../fn/users/users-unblock';
import { UsersUnblock$Params } from '../fn/users/users-unblock';
import { usersUnfollow } from '../fn/users/users-unfollow';
import { UsersUnfollow$Params } from '../fn/users/users-unfollow';
import { usersUpdateAuthenticated } from '../fn/users/users-update-authenticated';
import { UsersUpdateAuthenticated$Params } from '../fn/users/users-update-authenticated';


/**
 * Interact with and view information about users and also current user.
 */
@Injectable({ providedIn: 'root' })
export class UsersService extends BaseService {
  constructor(config: ApiConfiguration, http: HttpClient) {
    super(config, http);
  }

  /** Path part for operation `usersGetAuthenticated()` */
  static readonly UsersGetAuthenticatedPath = '/user';

  /**
   * Get the authenticated user.
   *
   * If the authenticated user is authenticated with an OAuth token with the `user` scope, then the response lists public and private profile information.
   *
   * If the authenticated user is authenticated through OAuth without the `user` scope, then the response lists only public profile information.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `usersGetAuthenticated()` instead.
   *
   * This method doesn't expect any request body.
   */
  usersGetAuthenticated$Response(params?: UsersGetAuthenticated$Params, context?: HttpContext): Observable<StrictHttpResponse<(PrivateUser | PublicUser)>> {
    return usersGetAuthenticated(this.http, this.rootUrl, params, context);
  }

  /**
   * Get the authenticated user.
   *
   * If the authenticated user is authenticated with an OAuth token with the `user` scope, then the response lists public and private profile information.
   *
   * If the authenticated user is authenticated through OAuth without the `user` scope, then the response lists only public profile information.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `usersGetAuthenticated$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  usersGetAuthenticated(params?: UsersGetAuthenticated$Params, context?: HttpContext): Observable<(PrivateUser | PublicUser)> {
    return this.usersGetAuthenticated$Response(params, context).pipe(
      map((r: StrictHttpResponse<(PrivateUser | PublicUser)>): (PrivateUser | PublicUser) => r.body)
    );
  }

  /** Path part for operation `usersUpdateAuthenticated()` */
  static readonly UsersUpdateAuthenticatedPath = '/user';

  /**
   * Update the authenticated user.
   *
   * **Note:** If your email is set to private and you send an `email` parameter as part of this request to update your profile, your privacy settings are still enforced: the email address will not be displayed on your public profile or via the API.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `usersUpdateAuthenticated()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  usersUpdateAuthenticated$Response(params?: UsersUpdateAuthenticated$Params, context?: HttpContext): Observable<StrictHttpResponse<PrivateUser>> {
    return usersUpdateAuthenticated(this.http, this.rootUrl, params, context);
  }

  /**
   * Update the authenticated user.
   *
   * **Note:** If your email is set to private and you send an `email` parameter as part of this request to update your profile, your privacy settings are still enforced: the email address will not be displayed on your public profile or via the API.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `usersUpdateAuthenticated$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  usersUpdateAuthenticated(params?: UsersUpdateAuthenticated$Params, context?: HttpContext): Observable<PrivateUser> {
    return this.usersUpdateAuthenticated$Response(params, context).pipe(
      map((r: StrictHttpResponse<PrivateUser>): PrivateUser => r.body)
    );
  }

  /** Path part for operation `usersListBlockedByAuthenticatedUser()` */
  static readonly UsersListBlockedByAuthenticatedUserPath = '/user/blocks';

  /**
   * List users blocked by the authenticated user.
   *
   * List the users you've blocked on your personal account.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `usersListBlockedByAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  usersListBlockedByAuthenticatedUser$Response(params?: UsersListBlockedByAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<SimpleUser>>> {
    return usersListBlockedByAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * List users blocked by the authenticated user.
   *
   * List the users you've blocked on your personal account.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `usersListBlockedByAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  usersListBlockedByAuthenticatedUser(params?: UsersListBlockedByAuthenticatedUser$Params, context?: HttpContext): Observable<Array<SimpleUser>> {
    return this.usersListBlockedByAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<SimpleUser>>): Array<SimpleUser> => r.body)
    );
  }

  /** Path part for operation `usersCheckBlocked()` */
  static readonly UsersCheckBlockedPath = '/user/blocks/{username}';

  /**
   * Check if a user is blocked by the authenticated user.
   *
   * Returns a 204 if the given user is blocked by the authenticated user. Returns a 404 if the given user is not blocked by the authenticated user, or if the given user account has been identified as spam by GitHub.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `usersCheckBlocked()` instead.
   *
   * This method doesn't expect any request body.
   */
  usersCheckBlocked$Response(params: UsersCheckBlocked$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return usersCheckBlocked(this.http, this.rootUrl, params, context);
  }

  /**
   * Check if a user is blocked by the authenticated user.
   *
   * Returns a 204 if the given user is blocked by the authenticated user. Returns a 404 if the given user is not blocked by the authenticated user, or if the given user account has been identified as spam by GitHub.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `usersCheckBlocked$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  usersCheckBlocked(params: UsersCheckBlocked$Params, context?: HttpContext): Observable<void> {
    return this.usersCheckBlocked$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `usersBlock()` */
  static readonly UsersBlockPath = '/user/blocks/{username}';

  /**
   * Block a user.
   *
   * Blocks the given user and returns a 204. If the authenticated user cannot block the given user a 422 is returned.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `usersBlock()` instead.
   *
   * This method doesn't expect any request body.
   */
  usersBlock$Response(params: UsersBlock$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return usersBlock(this.http, this.rootUrl, params, context);
  }

  /**
   * Block a user.
   *
   * Blocks the given user and returns a 204. If the authenticated user cannot block the given user a 422 is returned.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `usersBlock$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  usersBlock(params: UsersBlock$Params, context?: HttpContext): Observable<void> {
    return this.usersBlock$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `usersUnblock()` */
  static readonly UsersUnblockPath = '/user/blocks/{username}';

  /**
   * Unblock a user.
   *
   * Unblocks the given user and returns a 204.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `usersUnblock()` instead.
   *
   * This method doesn't expect any request body.
   */
  usersUnblock$Response(params: UsersUnblock$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return usersUnblock(this.http, this.rootUrl, params, context);
  }

  /**
   * Unblock a user.
   *
   * Unblocks the given user and returns a 204.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `usersUnblock$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  usersUnblock(params: UsersUnblock$Params, context?: HttpContext): Observable<void> {
    return this.usersUnblock$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `usersSetPrimaryEmailVisibilityForAuthenticatedUser()` */
  static readonly UsersSetPrimaryEmailVisibilityForAuthenticatedUserPath = '/user/email/visibility';

  /**
   * Set primary email visibility for the authenticated user.
   *
   * Sets the visibility for your primary email addresses.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `usersSetPrimaryEmailVisibilityForAuthenticatedUser()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  usersSetPrimaryEmailVisibilityForAuthenticatedUser$Response(params: UsersSetPrimaryEmailVisibilityForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Email>>> {
    return usersSetPrimaryEmailVisibilityForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Set primary email visibility for the authenticated user.
   *
   * Sets the visibility for your primary email addresses.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `usersSetPrimaryEmailVisibilityForAuthenticatedUser$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  usersSetPrimaryEmailVisibilityForAuthenticatedUser(params: UsersSetPrimaryEmailVisibilityForAuthenticatedUser$Params, context?: HttpContext): Observable<Array<Email>> {
    return this.usersSetPrimaryEmailVisibilityForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Email>>): Array<Email> => r.body)
    );
  }

  /** Path part for operation `usersListEmailsForAuthenticatedUser()` */
  static readonly UsersListEmailsForAuthenticatedUserPath = '/user/emails';

  /**
   * List email addresses for the authenticated user.
   *
   * Lists all of your email addresses, and specifies which one is visible to the public. This endpoint is accessible with the `user:email` scope.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `usersListEmailsForAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  usersListEmailsForAuthenticatedUser$Response(params?: UsersListEmailsForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Email>>> {
    return usersListEmailsForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * List email addresses for the authenticated user.
   *
   * Lists all of your email addresses, and specifies which one is visible to the public. This endpoint is accessible with the `user:email` scope.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `usersListEmailsForAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  usersListEmailsForAuthenticatedUser(params?: UsersListEmailsForAuthenticatedUser$Params, context?: HttpContext): Observable<Array<Email>> {
    return this.usersListEmailsForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Email>>): Array<Email> => r.body)
    );
  }

  /** Path part for operation `usersAddEmailForAuthenticatedUser()` */
  static readonly UsersAddEmailForAuthenticatedUserPath = '/user/emails';

  /**
   * Add an email address for the authenticated user.
   *
   * This endpoint is accessible with the `user` scope.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `usersAddEmailForAuthenticatedUser()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  usersAddEmailForAuthenticatedUser$Response(params?: UsersAddEmailForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Email>>> {
    return usersAddEmailForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Add an email address for the authenticated user.
   *
   * This endpoint is accessible with the `user` scope.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `usersAddEmailForAuthenticatedUser$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  usersAddEmailForAuthenticatedUser(params?: UsersAddEmailForAuthenticatedUser$Params, context?: HttpContext): Observable<Array<Email>> {
    return this.usersAddEmailForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Email>>): Array<Email> => r.body)
    );
  }

  /** Path part for operation `usersDeleteEmailForAuthenticatedUser()` */
  static readonly UsersDeleteEmailForAuthenticatedUserPath = '/user/emails';

  /**
   * Delete an email address for the authenticated user.
   *
   * This endpoint is accessible with the `user` scope.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `usersDeleteEmailForAuthenticatedUser()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  usersDeleteEmailForAuthenticatedUser$Response(params?: UsersDeleteEmailForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return usersDeleteEmailForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete an email address for the authenticated user.
   *
   * This endpoint is accessible with the `user` scope.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `usersDeleteEmailForAuthenticatedUser$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  usersDeleteEmailForAuthenticatedUser(params?: UsersDeleteEmailForAuthenticatedUser$Params, context?: HttpContext): Observable<void> {
    return this.usersDeleteEmailForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `usersListFollowersForAuthenticatedUser()` */
  static readonly UsersListFollowersForAuthenticatedUserPath = '/user/followers';

  /**
   * List followers of the authenticated user.
   *
   * Lists the people following the authenticated user.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `usersListFollowersForAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  usersListFollowersForAuthenticatedUser$Response(params?: UsersListFollowersForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<SimpleUser>>> {
    return usersListFollowersForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * List followers of the authenticated user.
   *
   * Lists the people following the authenticated user.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `usersListFollowersForAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  usersListFollowersForAuthenticatedUser(params?: UsersListFollowersForAuthenticatedUser$Params, context?: HttpContext): Observable<Array<SimpleUser>> {
    return this.usersListFollowersForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<SimpleUser>>): Array<SimpleUser> => r.body)
    );
  }

  /** Path part for operation `usersListFollowedByAuthenticatedUser()` */
  static readonly UsersListFollowedByAuthenticatedUserPath = '/user/following';

  /**
   * List the people the authenticated user follows.
   *
   * Lists the people who the authenticated user follows.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `usersListFollowedByAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  usersListFollowedByAuthenticatedUser$Response(params?: UsersListFollowedByAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<SimpleUser>>> {
    return usersListFollowedByAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * List the people the authenticated user follows.
   *
   * Lists the people who the authenticated user follows.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `usersListFollowedByAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  usersListFollowedByAuthenticatedUser(params?: UsersListFollowedByAuthenticatedUser$Params, context?: HttpContext): Observable<Array<SimpleUser>> {
    return this.usersListFollowedByAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<SimpleUser>>): Array<SimpleUser> => r.body)
    );
  }

  /** Path part for operation `usersCheckPersonIsFollowedByAuthenticated()` */
  static readonly UsersCheckPersonIsFollowedByAuthenticatedPath = '/user/following/{username}';

  /**
   * Check if a person is followed by the authenticated user.
   *
   *
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `usersCheckPersonIsFollowedByAuthenticated()` instead.
   *
   * This method doesn't expect any request body.
   */
  usersCheckPersonIsFollowedByAuthenticated$Response(params: UsersCheckPersonIsFollowedByAuthenticated$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return usersCheckPersonIsFollowedByAuthenticated(this.http, this.rootUrl, params, context);
  }

  /**
   * Check if a person is followed by the authenticated user.
   *
   *
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `usersCheckPersonIsFollowedByAuthenticated$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  usersCheckPersonIsFollowedByAuthenticated(params: UsersCheckPersonIsFollowedByAuthenticated$Params, context?: HttpContext): Observable<void> {
    return this.usersCheckPersonIsFollowedByAuthenticated$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `usersFollow()` */
  static readonly UsersFollowPath = '/user/following/{username}';

  /**
   * Follow a user.
   *
   * Note that you'll need to set `Content-Length` to zero when calling out to this endpoint. For more information, see "[HTTP verbs](https://docs.github.com/rest/overview/resources-in-the-rest-api#http-verbs)."
   *
   * Following a user requires the user to be logged in and authenticated with basic auth or OAuth with the `user:follow` scope.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `usersFollow()` instead.
   *
   * This method doesn't expect any request body.
   */
  usersFollow$Response(params: UsersFollow$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return usersFollow(this.http, this.rootUrl, params, context);
  }

  /**
   * Follow a user.
   *
   * Note that you'll need to set `Content-Length` to zero when calling out to this endpoint. For more information, see "[HTTP verbs](https://docs.github.com/rest/overview/resources-in-the-rest-api#http-verbs)."
   *
   * Following a user requires the user to be logged in and authenticated with basic auth or OAuth with the `user:follow` scope.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `usersFollow$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  usersFollow(params: UsersFollow$Params, context?: HttpContext): Observable<void> {
    return this.usersFollow$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `usersUnfollow()` */
  static readonly UsersUnfollowPath = '/user/following/{username}';

  /**
   * Unfollow a user.
   *
   * Unfollowing a user requires the user to be logged in and authenticated with basic auth or OAuth with the `user:follow` scope.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `usersUnfollow()` instead.
   *
   * This method doesn't expect any request body.
   */
  usersUnfollow$Response(params: UsersUnfollow$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return usersUnfollow(this.http, this.rootUrl, params, context);
  }

  /**
   * Unfollow a user.
   *
   * Unfollowing a user requires the user to be logged in and authenticated with basic auth or OAuth with the `user:follow` scope.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `usersUnfollow$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  usersUnfollow(params: UsersUnfollow$Params, context?: HttpContext): Observable<void> {
    return this.usersUnfollow$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `usersListGpgKeysForAuthenticatedUser()` */
  static readonly UsersListGpgKeysForAuthenticatedUserPath = '/user/gpg_keys';

  /**
   * List GPG keys for the authenticated user.
   *
   * Lists the current user's GPG keys. Requires that you are authenticated via Basic Auth or via OAuth with at least `read:gpg_key` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `usersListGpgKeysForAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  usersListGpgKeysForAuthenticatedUser$Response(params?: UsersListGpgKeysForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<GpgKey>>> {
    return usersListGpgKeysForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * List GPG keys for the authenticated user.
   *
   * Lists the current user's GPG keys. Requires that you are authenticated via Basic Auth or via OAuth with at least `read:gpg_key` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `usersListGpgKeysForAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  usersListGpgKeysForAuthenticatedUser(params?: UsersListGpgKeysForAuthenticatedUser$Params, context?: HttpContext): Observable<Array<GpgKey>> {
    return this.usersListGpgKeysForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<GpgKey>>): Array<GpgKey> => r.body)
    );
  }

  /** Path part for operation `usersCreateGpgKeyForAuthenticatedUser()` */
  static readonly UsersCreateGpgKeyForAuthenticatedUserPath = '/user/gpg_keys';

  /**
   * Create a GPG key for the authenticated user.
   *
   * Adds a GPG key to the authenticated user's GitHub account. Requires that you are authenticated via Basic Auth, or OAuth with at least `write:gpg_key` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `usersCreateGpgKeyForAuthenticatedUser()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  usersCreateGpgKeyForAuthenticatedUser$Response(params: UsersCreateGpgKeyForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<GpgKey>> {
    return usersCreateGpgKeyForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Create a GPG key for the authenticated user.
   *
   * Adds a GPG key to the authenticated user's GitHub account. Requires that you are authenticated via Basic Auth, or OAuth with at least `write:gpg_key` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `usersCreateGpgKeyForAuthenticatedUser$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  usersCreateGpgKeyForAuthenticatedUser(params: UsersCreateGpgKeyForAuthenticatedUser$Params, context?: HttpContext): Observable<GpgKey> {
    return this.usersCreateGpgKeyForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<GpgKey>): GpgKey => r.body)
    );
  }

  /** Path part for operation `usersGetGpgKeyForAuthenticatedUser()` */
  static readonly UsersGetGpgKeyForAuthenticatedUserPath = '/user/gpg_keys/{gpg_key_id}';

  /**
   * Get a GPG key for the authenticated user.
   *
   * View extended details for a single GPG key. Requires that you are authenticated via Basic Auth or via OAuth with at least `read:gpg_key` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `usersGetGpgKeyForAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  usersGetGpgKeyForAuthenticatedUser$Response(params: UsersGetGpgKeyForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<GpgKey>> {
    return usersGetGpgKeyForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a GPG key for the authenticated user.
   *
   * View extended details for a single GPG key. Requires that you are authenticated via Basic Auth or via OAuth with at least `read:gpg_key` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `usersGetGpgKeyForAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  usersGetGpgKeyForAuthenticatedUser(params: UsersGetGpgKeyForAuthenticatedUser$Params, context?: HttpContext): Observable<GpgKey> {
    return this.usersGetGpgKeyForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<GpgKey>): GpgKey => r.body)
    );
  }

  /** Path part for operation `usersDeleteGpgKeyForAuthenticatedUser()` */
  static readonly UsersDeleteGpgKeyForAuthenticatedUserPath = '/user/gpg_keys/{gpg_key_id}';

  /**
   * Delete a GPG key for the authenticated user.
   *
   * Removes a GPG key from the authenticated user's GitHub account. Requires that you are authenticated via Basic Auth or via OAuth with at least `admin:gpg_key` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `usersDeleteGpgKeyForAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  usersDeleteGpgKeyForAuthenticatedUser$Response(params: UsersDeleteGpgKeyForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return usersDeleteGpgKeyForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete a GPG key for the authenticated user.
   *
   * Removes a GPG key from the authenticated user's GitHub account. Requires that you are authenticated via Basic Auth or via OAuth with at least `admin:gpg_key` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `usersDeleteGpgKeyForAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  usersDeleteGpgKeyForAuthenticatedUser(params: UsersDeleteGpgKeyForAuthenticatedUser$Params, context?: HttpContext): Observable<void> {
    return this.usersDeleteGpgKeyForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `usersListPublicSshKeysForAuthenticatedUser()` */
  static readonly UsersListPublicSshKeysForAuthenticatedUserPath = '/user/keys';

  /**
   * List public SSH keys for the authenticated user.
   *
   * Lists the public SSH keys for the authenticated user's GitHub account. Requires that you are authenticated via Basic Auth or via OAuth with at least `read:public_key` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `usersListPublicSshKeysForAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  usersListPublicSshKeysForAuthenticatedUser$Response(params?: UsersListPublicSshKeysForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Key>>> {
    return usersListPublicSshKeysForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * List public SSH keys for the authenticated user.
   *
   * Lists the public SSH keys for the authenticated user's GitHub account. Requires that you are authenticated via Basic Auth or via OAuth with at least `read:public_key` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `usersListPublicSshKeysForAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  usersListPublicSshKeysForAuthenticatedUser(params?: UsersListPublicSshKeysForAuthenticatedUser$Params, context?: HttpContext): Observable<Array<Key>> {
    return this.usersListPublicSshKeysForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Key>>): Array<Key> => r.body)
    );
  }

  /** Path part for operation `usersCreatePublicSshKeyForAuthenticatedUser()` */
  static readonly UsersCreatePublicSshKeyForAuthenticatedUserPath = '/user/keys';

  /**
   * Create a public SSH key for the authenticated user.
   *
   * Adds a public SSH key to the authenticated user's GitHub account. Requires that you are authenticated via Basic Auth, or OAuth with at least `write:public_key` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `usersCreatePublicSshKeyForAuthenticatedUser()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  usersCreatePublicSshKeyForAuthenticatedUser$Response(params: UsersCreatePublicSshKeyForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Key>> {
    return usersCreatePublicSshKeyForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Create a public SSH key for the authenticated user.
   *
   * Adds a public SSH key to the authenticated user's GitHub account. Requires that you are authenticated via Basic Auth, or OAuth with at least `write:public_key` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `usersCreatePublicSshKeyForAuthenticatedUser$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  usersCreatePublicSshKeyForAuthenticatedUser(params: UsersCreatePublicSshKeyForAuthenticatedUser$Params, context?: HttpContext): Observable<Key> {
    return this.usersCreatePublicSshKeyForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<Key>): Key => r.body)
    );
  }

  /** Path part for operation `usersGetPublicSshKeyForAuthenticatedUser()` */
  static readonly UsersGetPublicSshKeyForAuthenticatedUserPath = '/user/keys/{key_id}';

  /**
   * Get a public SSH key for the authenticated user.
   *
   * View extended details for a single public SSH key. Requires that you are authenticated via Basic Auth or via OAuth with at least `read:public_key` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `usersGetPublicSshKeyForAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  usersGetPublicSshKeyForAuthenticatedUser$Response(params: UsersGetPublicSshKeyForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Key>> {
    return usersGetPublicSshKeyForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a public SSH key for the authenticated user.
   *
   * View extended details for a single public SSH key. Requires that you are authenticated via Basic Auth or via OAuth with at least `read:public_key` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `usersGetPublicSshKeyForAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  usersGetPublicSshKeyForAuthenticatedUser(params: UsersGetPublicSshKeyForAuthenticatedUser$Params, context?: HttpContext): Observable<Key> {
    return this.usersGetPublicSshKeyForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<Key>): Key => r.body)
    );
  }

  /** Path part for operation `usersDeletePublicSshKeyForAuthenticatedUser()` */
  static readonly UsersDeletePublicSshKeyForAuthenticatedUserPath = '/user/keys/{key_id}';

  /**
   * Delete a public SSH key for the authenticated user.
   *
   * Removes a public SSH key from the authenticated user's GitHub account. Requires that you are authenticated via Basic Auth or via OAuth with at least `admin:public_key` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `usersDeletePublicSshKeyForAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  usersDeletePublicSshKeyForAuthenticatedUser$Response(params: UsersDeletePublicSshKeyForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return usersDeletePublicSshKeyForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete a public SSH key for the authenticated user.
   *
   * Removes a public SSH key from the authenticated user's GitHub account. Requires that you are authenticated via Basic Auth or via OAuth with at least `admin:public_key` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `usersDeletePublicSshKeyForAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  usersDeletePublicSshKeyForAuthenticatedUser(params: UsersDeletePublicSshKeyForAuthenticatedUser$Params, context?: HttpContext): Observable<void> {
    return this.usersDeletePublicSshKeyForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `usersListPublicEmailsForAuthenticatedUser()` */
  static readonly UsersListPublicEmailsForAuthenticatedUserPath = '/user/public_emails';

  /**
   * List public email addresses for the authenticated user.
   *
   * Lists your publicly visible email address, which you can set with the [Set primary email visibility for the authenticated user](https://docs.github.com/rest/users/emails#set-primary-email-visibility-for-the-authenticated-user) endpoint. This endpoint is accessible with the `user:email` scope.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `usersListPublicEmailsForAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  usersListPublicEmailsForAuthenticatedUser$Response(params?: UsersListPublicEmailsForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Email>>> {
    return usersListPublicEmailsForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * List public email addresses for the authenticated user.
   *
   * Lists your publicly visible email address, which you can set with the [Set primary email visibility for the authenticated user](https://docs.github.com/rest/users/emails#set-primary-email-visibility-for-the-authenticated-user) endpoint. This endpoint is accessible with the `user:email` scope.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `usersListPublicEmailsForAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  usersListPublicEmailsForAuthenticatedUser(params?: UsersListPublicEmailsForAuthenticatedUser$Params, context?: HttpContext): Observable<Array<Email>> {
    return this.usersListPublicEmailsForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Email>>): Array<Email> => r.body)
    );
  }

  /** Path part for operation `usersListSocialAccountsForAuthenticatedUser()` */
  static readonly UsersListSocialAccountsForAuthenticatedUserPath = '/user/social_accounts';

  /**
   * List social accounts for the authenticated user.
   *
   * Lists all of your social accounts.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `usersListSocialAccountsForAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  usersListSocialAccountsForAuthenticatedUser$Response(params?: UsersListSocialAccountsForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<SocialAccount>>> {
    return usersListSocialAccountsForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * List social accounts for the authenticated user.
   *
   * Lists all of your social accounts.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `usersListSocialAccountsForAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  usersListSocialAccountsForAuthenticatedUser(params?: UsersListSocialAccountsForAuthenticatedUser$Params, context?: HttpContext): Observable<Array<SocialAccount>> {
    return this.usersListSocialAccountsForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<SocialAccount>>): Array<SocialAccount> => r.body)
    );
  }

  /** Path part for operation `usersAddSocialAccountForAuthenticatedUser()` */
  static readonly UsersAddSocialAccountForAuthenticatedUserPath = '/user/social_accounts';

  /**
   * Add social accounts for the authenticated user.
   *
   * Add one or more social accounts to the authenticated user's profile. This endpoint is accessible with the `user` scope.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `usersAddSocialAccountForAuthenticatedUser()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  usersAddSocialAccountForAuthenticatedUser$Response(params: UsersAddSocialAccountForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<SocialAccount>>> {
    return usersAddSocialAccountForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Add social accounts for the authenticated user.
   *
   * Add one or more social accounts to the authenticated user's profile. This endpoint is accessible with the `user` scope.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `usersAddSocialAccountForAuthenticatedUser$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  usersAddSocialAccountForAuthenticatedUser(params: UsersAddSocialAccountForAuthenticatedUser$Params, context?: HttpContext): Observable<Array<SocialAccount>> {
    return this.usersAddSocialAccountForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<SocialAccount>>): Array<SocialAccount> => r.body)
    );
  }

  /** Path part for operation `usersDeleteSocialAccountForAuthenticatedUser()` */
  static readonly UsersDeleteSocialAccountForAuthenticatedUserPath = '/user/social_accounts';

  /**
   * Delete social accounts for the authenticated user.
   *
   * Deletes one or more social accounts from the authenticated user's profile. This endpoint is accessible with the `user` scope.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `usersDeleteSocialAccountForAuthenticatedUser()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  usersDeleteSocialAccountForAuthenticatedUser$Response(params: UsersDeleteSocialAccountForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return usersDeleteSocialAccountForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete social accounts for the authenticated user.
   *
   * Deletes one or more social accounts from the authenticated user's profile. This endpoint is accessible with the `user` scope.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `usersDeleteSocialAccountForAuthenticatedUser$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  usersDeleteSocialAccountForAuthenticatedUser(params: UsersDeleteSocialAccountForAuthenticatedUser$Params, context?: HttpContext): Observable<void> {
    return this.usersDeleteSocialAccountForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `usersListSshSigningKeysForAuthenticatedUser()` */
  static readonly UsersListSshSigningKeysForAuthenticatedUserPath = '/user/ssh_signing_keys';

  /**
   * List SSH signing keys for the authenticated user.
   *
   * Lists the SSH signing keys for the authenticated user's GitHub account. You must authenticate with Basic Authentication, or you must authenticate with OAuth with at least `read:ssh_signing_key` scope. For more information, see "[Understanding scopes for OAuth apps](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/)."
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `usersListSshSigningKeysForAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  usersListSshSigningKeysForAuthenticatedUser$Response(params?: UsersListSshSigningKeysForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<SshSigningKey>>> {
    return usersListSshSigningKeysForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * List SSH signing keys for the authenticated user.
   *
   * Lists the SSH signing keys for the authenticated user's GitHub account. You must authenticate with Basic Authentication, or you must authenticate with OAuth with at least `read:ssh_signing_key` scope. For more information, see "[Understanding scopes for OAuth apps](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/)."
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `usersListSshSigningKeysForAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  usersListSshSigningKeysForAuthenticatedUser(params?: UsersListSshSigningKeysForAuthenticatedUser$Params, context?: HttpContext): Observable<Array<SshSigningKey>> {
    return this.usersListSshSigningKeysForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<SshSigningKey>>): Array<SshSigningKey> => r.body)
    );
  }

  /** Path part for operation `usersCreateSshSigningKeyForAuthenticatedUser()` */
  static readonly UsersCreateSshSigningKeyForAuthenticatedUserPath = '/user/ssh_signing_keys';

  /**
   * Create a SSH signing key for the authenticated user.
   *
   * Creates an SSH signing key for the authenticated user's GitHub account. You must authenticate with Basic Authentication, or you must authenticate with OAuth with at least `write:ssh_signing_key` scope. For more information, see "[Understanding scopes for OAuth apps](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/)."
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `usersCreateSshSigningKeyForAuthenticatedUser()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  usersCreateSshSigningKeyForAuthenticatedUser$Response(params: UsersCreateSshSigningKeyForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<SshSigningKey>> {
    return usersCreateSshSigningKeyForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Create a SSH signing key for the authenticated user.
   *
   * Creates an SSH signing key for the authenticated user's GitHub account. You must authenticate with Basic Authentication, or you must authenticate with OAuth with at least `write:ssh_signing_key` scope. For more information, see "[Understanding scopes for OAuth apps](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/)."
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `usersCreateSshSigningKeyForAuthenticatedUser$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  usersCreateSshSigningKeyForAuthenticatedUser(params: UsersCreateSshSigningKeyForAuthenticatedUser$Params, context?: HttpContext): Observable<SshSigningKey> {
    return this.usersCreateSshSigningKeyForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<SshSigningKey>): SshSigningKey => r.body)
    );
  }

  /** Path part for operation `usersGetSshSigningKeyForAuthenticatedUser()` */
  static readonly UsersGetSshSigningKeyForAuthenticatedUserPath = '/user/ssh_signing_keys/{ssh_signing_key_id}';

  /**
   * Get an SSH signing key for the authenticated user.
   *
   * Gets extended details for an SSH signing key. You must authenticate with Basic Authentication, or you must authenticate with OAuth with at least `read:ssh_signing_key` scope. For more information, see "[Understanding scopes for OAuth apps](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/)."
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `usersGetSshSigningKeyForAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  usersGetSshSigningKeyForAuthenticatedUser$Response(params: UsersGetSshSigningKeyForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<SshSigningKey>> {
    return usersGetSshSigningKeyForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Get an SSH signing key for the authenticated user.
   *
   * Gets extended details for an SSH signing key. You must authenticate with Basic Authentication, or you must authenticate with OAuth with at least `read:ssh_signing_key` scope. For more information, see "[Understanding scopes for OAuth apps](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/)."
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `usersGetSshSigningKeyForAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  usersGetSshSigningKeyForAuthenticatedUser(params: UsersGetSshSigningKeyForAuthenticatedUser$Params, context?: HttpContext): Observable<SshSigningKey> {
    return this.usersGetSshSigningKeyForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<SshSigningKey>): SshSigningKey => r.body)
    );
  }

  /** Path part for operation `usersDeleteSshSigningKeyForAuthenticatedUser()` */
  static readonly UsersDeleteSshSigningKeyForAuthenticatedUserPath = '/user/ssh_signing_keys/{ssh_signing_key_id}';

  /**
   * Delete an SSH signing key for the authenticated user.
   *
   * Deletes an SSH signing key from the authenticated user's GitHub account. You must authenticate with Basic Authentication, or you must authenticate with OAuth with at least `admin:ssh_signing_key` scope. For more information, see "[Understanding scopes for OAuth apps](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/)."
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `usersDeleteSshSigningKeyForAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  usersDeleteSshSigningKeyForAuthenticatedUser$Response(params: UsersDeleteSshSigningKeyForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return usersDeleteSshSigningKeyForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete an SSH signing key for the authenticated user.
   *
   * Deletes an SSH signing key from the authenticated user's GitHub account. You must authenticate with Basic Authentication, or you must authenticate with OAuth with at least `admin:ssh_signing_key` scope. For more information, see "[Understanding scopes for OAuth apps](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/)."
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `usersDeleteSshSigningKeyForAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  usersDeleteSshSigningKeyForAuthenticatedUser(params: UsersDeleteSshSigningKeyForAuthenticatedUser$Params, context?: HttpContext): Observable<void> {
    return this.usersDeleteSshSigningKeyForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `usersList()` */
  static readonly UsersListPath = '/users';

  /**
   * List users.
   *
   * Lists all users, in the order that they signed up on GitHub. This list includes personal user accounts and organization accounts.
   *
   * Note: Pagination is powered exclusively by the `since` parameter. Use the [Link header](https://docs.github.com/rest/guides/using-pagination-in-the-rest-api#using-link-headers) to get the URL for the next page of users.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `usersList()` instead.
   *
   * This method doesn't expect any request body.
   */
  usersList$Response(params?: UsersList$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<SimpleUser>>> {
    return usersList(this.http, this.rootUrl, params, context);
  }

  /**
   * List users.
   *
   * Lists all users, in the order that they signed up on GitHub. This list includes personal user accounts and organization accounts.
   *
   * Note: Pagination is powered exclusively by the `since` parameter. Use the [Link header](https://docs.github.com/rest/guides/using-pagination-in-the-rest-api#using-link-headers) to get the URL for the next page of users.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `usersList$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  usersList(params?: UsersList$Params, context?: HttpContext): Observable<Array<SimpleUser>> {
    return this.usersList$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<SimpleUser>>): Array<SimpleUser> => r.body)
    );
  }

  /** Path part for operation `usersGetByUsername()` */
  static readonly UsersGetByUsernamePath = '/users/{username}';

  /**
   * Get a user.
   *
   * Provides publicly available information about someone with a GitHub account.
   *
   * GitHub Apps with the `Plan` user permission can use this endpoint to retrieve information about a user's GitHub plan. The GitHub App must be authenticated as a user. See "[Identifying and authorizing users for GitHub Apps](https://docs.github.com/apps/building-github-apps/identifying-and-authorizing-users-for-github-apps/)" for details about authentication. For an example response, see 'Response with GitHub plan information' below"
   *
   * The `email` key in the following response is the publicly visible email address from your GitHub [profile page](https://github.com/settings/profile). When setting up your profile, you can select a primary email address to be “public” which provides an email entry for this endpoint. If you do not set a public email address for `email`, then it will have a value of `null`. You only see publicly visible email addresses when authenticated with GitHub. For more information, see [Authentication](https://docs.github.com/rest/overview/resources-in-the-rest-api#authentication).
   *
   * The Emails API enables you to list all of your email addresses, and toggle a primary email to be visible publicly. For more information, see "[Emails API](https://docs.github.com/rest/users/emails)".
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `usersGetByUsername()` instead.
   *
   * This method doesn't expect any request body.
   */
  usersGetByUsername$Response(params: UsersGetByUsername$Params, context?: HttpContext): Observable<StrictHttpResponse<(PrivateUser | PublicUser)>> {
    return usersGetByUsername(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a user.
   *
   * Provides publicly available information about someone with a GitHub account.
   *
   * GitHub Apps with the `Plan` user permission can use this endpoint to retrieve information about a user's GitHub plan. The GitHub App must be authenticated as a user. See "[Identifying and authorizing users for GitHub Apps](https://docs.github.com/apps/building-github-apps/identifying-and-authorizing-users-for-github-apps/)" for details about authentication. For an example response, see 'Response with GitHub plan information' below"
   *
   * The `email` key in the following response is the publicly visible email address from your GitHub [profile page](https://github.com/settings/profile). When setting up your profile, you can select a primary email address to be “public” which provides an email entry for this endpoint. If you do not set a public email address for `email`, then it will have a value of `null`. You only see publicly visible email addresses when authenticated with GitHub. For more information, see [Authentication](https://docs.github.com/rest/overview/resources-in-the-rest-api#authentication).
   *
   * The Emails API enables you to list all of your email addresses, and toggle a primary email to be visible publicly. For more information, see "[Emails API](https://docs.github.com/rest/users/emails)".
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `usersGetByUsername$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  usersGetByUsername(params: UsersGetByUsername$Params, context?: HttpContext): Observable<(PrivateUser | PublicUser)> {
    return this.usersGetByUsername$Response(params, context).pipe(
      map((r: StrictHttpResponse<(PrivateUser | PublicUser)>): (PrivateUser | PublicUser) => r.body)
    );
  }

  /** Path part for operation `usersListFollowersForUser()` */
  static readonly UsersListFollowersForUserPath = '/users/{username}/followers';

  /**
   * List followers of a user.
   *
   * Lists the people following the specified user.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `usersListFollowersForUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  usersListFollowersForUser$Response(params: UsersListFollowersForUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<SimpleUser>>> {
    return usersListFollowersForUser(this.http, this.rootUrl, params, context);
  }

  /**
   * List followers of a user.
   *
   * Lists the people following the specified user.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `usersListFollowersForUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  usersListFollowersForUser(params: UsersListFollowersForUser$Params, context?: HttpContext): Observable<Array<SimpleUser>> {
    return this.usersListFollowersForUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<SimpleUser>>): Array<SimpleUser> => r.body)
    );
  }

  /** Path part for operation `usersListFollowingForUser()` */
  static readonly UsersListFollowingForUserPath = '/users/{username}/following';

  /**
   * List the people a user follows.
   *
   * Lists the people who the specified user follows.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `usersListFollowingForUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  usersListFollowingForUser$Response(params: UsersListFollowingForUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<SimpleUser>>> {
    return usersListFollowingForUser(this.http, this.rootUrl, params, context);
  }

  /**
   * List the people a user follows.
   *
   * Lists the people who the specified user follows.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `usersListFollowingForUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  usersListFollowingForUser(params: UsersListFollowingForUser$Params, context?: HttpContext): Observable<Array<SimpleUser>> {
    return this.usersListFollowingForUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<SimpleUser>>): Array<SimpleUser> => r.body)
    );
  }

  /** Path part for operation `usersCheckFollowingForUser()` */
  static readonly UsersCheckFollowingForUserPath = '/users/{username}/following/{target_user}';

  /**
   * Check if a user follows another user.
   *
   *
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `usersCheckFollowingForUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  usersCheckFollowingForUser$Response(params: UsersCheckFollowingForUser$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return usersCheckFollowingForUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Check if a user follows another user.
   *
   *
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `usersCheckFollowingForUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  usersCheckFollowingForUser(params: UsersCheckFollowingForUser$Params, context?: HttpContext): Observable<void> {
    return this.usersCheckFollowingForUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `usersListGpgKeysForUser()` */
  static readonly UsersListGpgKeysForUserPath = '/users/{username}/gpg_keys';

  /**
   * List GPG keys for a user.
   *
   * Lists the GPG keys for a user. This information is accessible by anyone.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `usersListGpgKeysForUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  usersListGpgKeysForUser$Response(params: UsersListGpgKeysForUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<GpgKey>>> {
    return usersListGpgKeysForUser(this.http, this.rootUrl, params, context);
  }

  /**
   * List GPG keys for a user.
   *
   * Lists the GPG keys for a user. This information is accessible by anyone.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `usersListGpgKeysForUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  usersListGpgKeysForUser(params: UsersListGpgKeysForUser$Params, context?: HttpContext): Observable<Array<GpgKey>> {
    return this.usersListGpgKeysForUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<GpgKey>>): Array<GpgKey> => r.body)
    );
  }

  /** Path part for operation `usersGetContextForUser()` */
  static readonly UsersGetContextForUserPath = '/users/{username}/hovercard';

  /**
   * Get contextual information for a user.
   *
   * Provides hovercard information when authenticated through basic auth or OAuth with the `repo` scope. You can find out more about someone in relation to their pull requests, issues, repositories, and organizations.
   *
   * The `subject_type` and `subject_id` parameters provide context for the person's hovercard, which returns more information than without the parameters. For example, if you wanted to find out more about `octocat` who owns the `Spoon-Knife` repository via cURL, it would look like this:
   *
   * ```shell
   *  curl -u username:token
   *   https://api.github.com/users/octocat/hovercard?subject_type=repository&subject_id=1300192
   * ```
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `usersGetContextForUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  usersGetContextForUser$Response(params: UsersGetContextForUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Hovercard>> {
    return usersGetContextForUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Get contextual information for a user.
   *
   * Provides hovercard information when authenticated through basic auth or OAuth with the `repo` scope. You can find out more about someone in relation to their pull requests, issues, repositories, and organizations.
   *
   * The `subject_type` and `subject_id` parameters provide context for the person's hovercard, which returns more information than without the parameters. For example, if you wanted to find out more about `octocat` who owns the `Spoon-Knife` repository via cURL, it would look like this:
   *
   * ```shell
   *  curl -u username:token
   *   https://api.github.com/users/octocat/hovercard?subject_type=repository&subject_id=1300192
   * ```
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `usersGetContextForUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  usersGetContextForUser(params: UsersGetContextForUser$Params, context?: HttpContext): Observable<Hovercard> {
    return this.usersGetContextForUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<Hovercard>): Hovercard => r.body)
    );
  }

  /** Path part for operation `usersListPublicKeysForUser()` */
  static readonly UsersListPublicKeysForUserPath = '/users/{username}/keys';

  /**
   * List public keys for a user.
   *
   * Lists the _verified_ public SSH keys for a user. This is accessible by anyone.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `usersListPublicKeysForUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  usersListPublicKeysForUser$Response(params: UsersListPublicKeysForUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<KeySimple>>> {
    return usersListPublicKeysForUser(this.http, this.rootUrl, params, context);
  }

  /**
   * List public keys for a user.
   *
   * Lists the _verified_ public SSH keys for a user. This is accessible by anyone.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `usersListPublicKeysForUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  usersListPublicKeysForUser(params: UsersListPublicKeysForUser$Params, context?: HttpContext): Observable<Array<KeySimple>> {
    return this.usersListPublicKeysForUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<KeySimple>>): Array<KeySimple> => r.body)
    );
  }

  /** Path part for operation `usersListSocialAccountsForUser()` */
  static readonly UsersListSocialAccountsForUserPath = '/users/{username}/social_accounts';

  /**
   * List social accounts for a user.
   *
   * Lists social media accounts for a user. This endpoint is accessible by anyone.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `usersListSocialAccountsForUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  usersListSocialAccountsForUser$Response(params: UsersListSocialAccountsForUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<SocialAccount>>> {
    return usersListSocialAccountsForUser(this.http, this.rootUrl, params, context);
  }

  /**
   * List social accounts for a user.
   *
   * Lists social media accounts for a user. This endpoint is accessible by anyone.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `usersListSocialAccountsForUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  usersListSocialAccountsForUser(params: UsersListSocialAccountsForUser$Params, context?: HttpContext): Observable<Array<SocialAccount>> {
    return this.usersListSocialAccountsForUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<SocialAccount>>): Array<SocialAccount> => r.body)
    );
  }

  /** Path part for operation `usersListSshSigningKeysForUser()` */
  static readonly UsersListSshSigningKeysForUserPath = '/users/{username}/ssh_signing_keys';

  /**
   * List SSH signing keys for a user.
   *
   * Lists the SSH signing keys for a user. This operation is accessible by anyone.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `usersListSshSigningKeysForUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  usersListSshSigningKeysForUser$Response(params: UsersListSshSigningKeysForUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<SshSigningKey>>> {
    return usersListSshSigningKeysForUser(this.http, this.rootUrl, params, context);
  }

  /**
   * List SSH signing keys for a user.
   *
   * Lists the SSH signing keys for a user. This operation is accessible by anyone.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `usersListSshSigningKeysForUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  usersListSshSigningKeysForUser(params: UsersListSshSigningKeysForUser$Params, context?: HttpContext): Observable<Array<SshSigningKey>> {
    return this.usersListSshSigningKeysForUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<SshSigningKey>>): Array<SshSigningKey> => r.body)
    );
  }

}
