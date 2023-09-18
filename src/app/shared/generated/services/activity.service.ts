/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { BaseService } from '../base-service';
import { ApiConfiguration } from '../api-configuration';
import { StrictHttpResponse } from '../strict-http-response';

import { activityCheckRepoIsStarredByAuthenticatedUser } from '../fn/activity/activity-check-repo-is-starred-by-authenticated-user';
import { ActivityCheckRepoIsStarredByAuthenticatedUser$Params } from '../fn/activity/activity-check-repo-is-starred-by-authenticated-user';
import { activityDeleteRepoSubscription } from '../fn/activity/activity-delete-repo-subscription';
import { ActivityDeleteRepoSubscription$Params } from '../fn/activity/activity-delete-repo-subscription';
import { activityDeleteThreadSubscription } from '../fn/activity/activity-delete-thread-subscription';
import { ActivityDeleteThreadSubscription$Params } from '../fn/activity/activity-delete-thread-subscription';
import { activityGetFeeds } from '../fn/activity/activity-get-feeds';
import { ActivityGetFeeds$Params } from '../fn/activity/activity-get-feeds';
import { activityGetRepoSubscription } from '../fn/activity/activity-get-repo-subscription';
import { ActivityGetRepoSubscription$Params } from '../fn/activity/activity-get-repo-subscription';
import { activityGetThread } from '../fn/activity/activity-get-thread';
import { ActivityGetThread$Params } from '../fn/activity/activity-get-thread';
import { activityGetThreadSubscriptionForAuthenticatedUser } from '../fn/activity/activity-get-thread-subscription-for-authenticated-user';
import { ActivityGetThreadSubscriptionForAuthenticatedUser$Params } from '../fn/activity/activity-get-thread-subscription-for-authenticated-user';
import { activityListEventsForAuthenticatedUser } from '../fn/activity/activity-list-events-for-authenticated-user';
import { ActivityListEventsForAuthenticatedUser$Params } from '../fn/activity/activity-list-events-for-authenticated-user';
import { activityListNotificationsForAuthenticatedUser } from '../fn/activity/activity-list-notifications-for-authenticated-user';
import { ActivityListNotificationsForAuthenticatedUser$Params } from '../fn/activity/activity-list-notifications-for-authenticated-user';
import { activityListOrgEventsForAuthenticatedUser } from '../fn/activity/activity-list-org-events-for-authenticated-user';
import { ActivityListOrgEventsForAuthenticatedUser$Params } from '../fn/activity/activity-list-org-events-for-authenticated-user';
import { activityListPublicEvents } from '../fn/activity/activity-list-public-events';
import { ActivityListPublicEvents$Params } from '../fn/activity/activity-list-public-events';
import { activityListPublicEventsForRepoNetwork } from '../fn/activity/activity-list-public-events-for-repo-network';
import { ActivityListPublicEventsForRepoNetwork$Params } from '../fn/activity/activity-list-public-events-for-repo-network';
import { activityListPublicEventsForUser } from '../fn/activity/activity-list-public-events-for-user';
import { ActivityListPublicEventsForUser$Params } from '../fn/activity/activity-list-public-events-for-user';
import { activityListPublicOrgEvents } from '../fn/activity/activity-list-public-org-events';
import { ActivityListPublicOrgEvents$Params } from '../fn/activity/activity-list-public-org-events';
import { activityListReceivedEventsForUser } from '../fn/activity/activity-list-received-events-for-user';
import { ActivityListReceivedEventsForUser$Params } from '../fn/activity/activity-list-received-events-for-user';
import { activityListReceivedPublicEventsForUser } from '../fn/activity/activity-list-received-public-events-for-user';
import { ActivityListReceivedPublicEventsForUser$Params } from '../fn/activity/activity-list-received-public-events-for-user';
import { activityListRepoEvents } from '../fn/activity/activity-list-repo-events';
import { ActivityListRepoEvents$Params } from '../fn/activity/activity-list-repo-events';
import { activityListRepoNotificationsForAuthenticatedUser } from '../fn/activity/activity-list-repo-notifications-for-authenticated-user';
import { ActivityListRepoNotificationsForAuthenticatedUser$Params } from '../fn/activity/activity-list-repo-notifications-for-authenticated-user';
import { activityListReposStarredByAuthenticatedUser } from '../fn/activity/activity-list-repos-starred-by-authenticated-user';
import { ActivityListReposStarredByAuthenticatedUser$Params } from '../fn/activity/activity-list-repos-starred-by-authenticated-user';
import { activityListReposStarredByUser } from '../fn/activity/activity-list-repos-starred-by-user';
import { ActivityListReposStarredByUser$Params } from '../fn/activity/activity-list-repos-starred-by-user';
import { activityListReposWatchedByUser } from '../fn/activity/activity-list-repos-watched-by-user';
import { ActivityListReposWatchedByUser$Params } from '../fn/activity/activity-list-repos-watched-by-user';
import { activityListStargazersForRepo } from '../fn/activity/activity-list-stargazers-for-repo';
import { ActivityListStargazersForRepo$Params } from '../fn/activity/activity-list-stargazers-for-repo';
import { activityListWatchedReposForAuthenticatedUser } from '../fn/activity/activity-list-watched-repos-for-authenticated-user';
import { ActivityListWatchedReposForAuthenticatedUser$Params } from '../fn/activity/activity-list-watched-repos-for-authenticated-user';
import { activityListWatchersForRepo } from '../fn/activity/activity-list-watchers-for-repo';
import { ActivityListWatchersForRepo$Params } from '../fn/activity/activity-list-watchers-for-repo';
import { activityMarkNotificationsAsRead } from '../fn/activity/activity-mark-notifications-as-read';
import { ActivityMarkNotificationsAsRead$Params } from '../fn/activity/activity-mark-notifications-as-read';
import { activityMarkRepoNotificationsAsRead } from '../fn/activity/activity-mark-repo-notifications-as-read';
import { ActivityMarkRepoNotificationsAsRead$Params } from '../fn/activity/activity-mark-repo-notifications-as-read';
import { activityMarkThreadAsRead } from '../fn/activity/activity-mark-thread-as-read';
import { ActivityMarkThreadAsRead$Params } from '../fn/activity/activity-mark-thread-as-read';
import { activitySetRepoSubscription } from '../fn/activity/activity-set-repo-subscription';
import { ActivitySetRepoSubscription$Params } from '../fn/activity/activity-set-repo-subscription';
import { activitySetThreadSubscription } from '../fn/activity/activity-set-thread-subscription';
import { ActivitySetThreadSubscription$Params } from '../fn/activity/activity-set-thread-subscription';
import { activityStarRepoForAuthenticatedUser } from '../fn/activity/activity-star-repo-for-authenticated-user';
import { ActivityStarRepoForAuthenticatedUser$Params } from '../fn/activity/activity-star-repo-for-authenticated-user';
import { activityUnstarRepoForAuthenticatedUser } from '../fn/activity/activity-unstar-repo-for-authenticated-user';
import { ActivityUnstarRepoForAuthenticatedUser$Params } from '../fn/activity/activity-unstar-repo-for-authenticated-user';
import { Event } from '../models/event';
import { Feed } from '../models/feed';
import { MinimalRepository } from '../models/minimal-repository';
import { Repository } from '../models/repository';
import { RepositorySubscription } from '../models/repository-subscription';
import { SimpleUser } from '../models/simple-user';
import { Stargazer } from '../models/stargazer';
import { StarredRepository } from '../models/starred-repository';
import { Thread } from '../models/thread';
import { ThreadSubscription } from '../models/thread-subscription';


/**
 * Activity APIs provide access to notifications, subscriptions, and timelines.
 */
@Injectable({ providedIn: 'root' })
export class ActivityService extends BaseService {
  constructor(config: ApiConfiguration, http: HttpClient) {
    super(config, http);
  }

  /** Path part for operation `activityListPublicEvents()` */
  static readonly ActivityListPublicEventsPath = '/events';

  /**
   * List public events.
   *
   * We delay the public events feed by five minutes, which means the most recent event returned by the public events API actually occurred at least five minutes ago.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `activityListPublicEvents()` instead.
   *
   * This method doesn't expect any request body.
   */
  activityListPublicEvents$Response(params?: ActivityListPublicEvents$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Event>>> {
    return activityListPublicEvents(this.http, this.rootUrl, params, context);
  }

  /**
   * List public events.
   *
   * We delay the public events feed by five minutes, which means the most recent event returned by the public events API actually occurred at least five minutes ago.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `activityListPublicEvents$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  activityListPublicEvents(params?: ActivityListPublicEvents$Params, context?: HttpContext): Observable<Array<Event>> {
    return this.activityListPublicEvents$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Event>>): Array<Event> => r.body)
    );
  }

  /** Path part for operation `activityGetFeeds()` */
  static readonly ActivityGetFeedsPath = '/feeds';

  /**
   * Get feeds.
   *
   * GitHub provides several timeline resources in [Atom](http://en.wikipedia.org/wiki/Atom_(standard)) format. The Feeds API lists all the feeds available to the authenticated user:
   *
   * *   **Timeline**: The GitHub global public timeline
   * *   **User**: The public timeline for any user, using [URI template](https://docs.github.com/rest/overview/resources-in-the-rest-api#hypermedia)
   * *   **Current user public**: The public timeline for the authenticated user
   * *   **Current user**: The private timeline for the authenticated user
   * *   **Current user actor**: The private timeline for activity created by the authenticated user
   * *   **Current user organizations**: The private timeline for the organizations the authenticated user is a member of.
   * *   **Security advisories**: A collection of public announcements that provide information about security-related vulnerabilities in software on GitHub.
   *
   * **Note**: Private feeds are only returned when [authenticating via Basic Auth](https://docs.github.com/rest/overview/other-authentication-methods#basic-authentication) since current feed URIs use the older, non revocable auth tokens.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `activityGetFeeds()` instead.
   *
   * This method doesn't expect any request body.
   */
  activityGetFeeds$Response(params?: ActivityGetFeeds$Params, context?: HttpContext): Observable<StrictHttpResponse<Feed>> {
    return activityGetFeeds(this.http, this.rootUrl, params, context);
  }

  /**
   * Get feeds.
   *
   * GitHub provides several timeline resources in [Atom](http://en.wikipedia.org/wiki/Atom_(standard)) format. The Feeds API lists all the feeds available to the authenticated user:
   *
   * *   **Timeline**: The GitHub global public timeline
   * *   **User**: The public timeline for any user, using [URI template](https://docs.github.com/rest/overview/resources-in-the-rest-api#hypermedia)
   * *   **Current user public**: The public timeline for the authenticated user
   * *   **Current user**: The private timeline for the authenticated user
   * *   **Current user actor**: The private timeline for activity created by the authenticated user
   * *   **Current user organizations**: The private timeline for the organizations the authenticated user is a member of.
   * *   **Security advisories**: A collection of public announcements that provide information about security-related vulnerabilities in software on GitHub.
   *
   * **Note**: Private feeds are only returned when [authenticating via Basic Auth](https://docs.github.com/rest/overview/other-authentication-methods#basic-authentication) since current feed URIs use the older, non revocable auth tokens.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `activityGetFeeds$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  activityGetFeeds(params?: ActivityGetFeeds$Params, context?: HttpContext): Observable<Feed> {
    return this.activityGetFeeds$Response(params, context).pipe(
      map((r: StrictHttpResponse<Feed>): Feed => r.body)
    );
  }

  /** Path part for operation `activityListPublicEventsForRepoNetwork()` */
  static readonly ActivityListPublicEventsForRepoNetworkPath = '/networks/{owner}/{repo}/events';

  /**
   * List public events for a network of repositories.
   *
   *
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `activityListPublicEventsForRepoNetwork()` instead.
   *
   * This method doesn't expect any request body.
   */
  activityListPublicEventsForRepoNetwork$Response(params: ActivityListPublicEventsForRepoNetwork$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Event>>> {
    return activityListPublicEventsForRepoNetwork(this.http, this.rootUrl, params, context);
  }

  /**
   * List public events for a network of repositories.
   *
   *
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `activityListPublicEventsForRepoNetwork$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  activityListPublicEventsForRepoNetwork(params: ActivityListPublicEventsForRepoNetwork$Params, context?: HttpContext): Observable<Array<Event>> {
    return this.activityListPublicEventsForRepoNetwork$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Event>>): Array<Event> => r.body)
    );
  }

  /** Path part for operation `activityListNotificationsForAuthenticatedUser()` */
  static readonly ActivityListNotificationsForAuthenticatedUserPath = '/notifications';

  /**
   * List notifications for the authenticated user.
   *
   * List all notifications for the current user, sorted by most recently updated.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `activityListNotificationsForAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  activityListNotificationsForAuthenticatedUser$Response(params?: ActivityListNotificationsForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Thread>>> {
    return activityListNotificationsForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * List notifications for the authenticated user.
   *
   * List all notifications for the current user, sorted by most recently updated.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `activityListNotificationsForAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  activityListNotificationsForAuthenticatedUser(params?: ActivityListNotificationsForAuthenticatedUser$Params, context?: HttpContext): Observable<Array<Thread>> {
    return this.activityListNotificationsForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Thread>>): Array<Thread> => r.body)
    );
  }

  /** Path part for operation `activityMarkNotificationsAsRead()` */
  static readonly ActivityMarkNotificationsAsReadPath = '/notifications';

  /**
   * Mark notifications as read.
   *
   * Marks all notifications as "read" for the current user. If the number of notifications is too large to complete in one request, you will receive a `202 Accepted` status and GitHub will run an asynchronous process to mark notifications as "read." To check whether any "unread" notifications remain, you can use the [List notifications for the authenticated user](https://docs.github.com/rest/activity/notifications#list-notifications-for-the-authenticated-user) endpoint and pass the query parameter `all=false`.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `activityMarkNotificationsAsRead()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  activityMarkNotificationsAsRead$Response(params?: ActivityMarkNotificationsAsRead$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'message'?: string;
}>> {
    return activityMarkNotificationsAsRead(this.http, this.rootUrl, params, context);
  }

  /**
   * Mark notifications as read.
   *
   * Marks all notifications as "read" for the current user. If the number of notifications is too large to complete in one request, you will receive a `202 Accepted` status and GitHub will run an asynchronous process to mark notifications as "read." To check whether any "unread" notifications remain, you can use the [List notifications for the authenticated user](https://docs.github.com/rest/activity/notifications#list-notifications-for-the-authenticated-user) endpoint and pass the query parameter `all=false`.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `activityMarkNotificationsAsRead$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  activityMarkNotificationsAsRead(params?: ActivityMarkNotificationsAsRead$Params, context?: HttpContext): Observable<{
'message'?: string;
}> {
    return this.activityMarkNotificationsAsRead$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'message'?: string;
}>): {
'message'?: string;
} => r.body)
    );
  }

  /** Path part for operation `activityGetThread()` */
  static readonly ActivityGetThreadPath = '/notifications/threads/{thread_id}';

  /**
   * Get a thread.
   *
   * Gets information about a notification thread.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `activityGetThread()` instead.
   *
   * This method doesn't expect any request body.
   */
  activityGetThread$Response(params: ActivityGetThread$Params, context?: HttpContext): Observable<StrictHttpResponse<Thread>> {
    return activityGetThread(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a thread.
   *
   * Gets information about a notification thread.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `activityGetThread$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  activityGetThread(params: ActivityGetThread$Params, context?: HttpContext): Observable<Thread> {
    return this.activityGetThread$Response(params, context).pipe(
      map((r: StrictHttpResponse<Thread>): Thread => r.body)
    );
  }

  /** Path part for operation `activityMarkThreadAsRead()` */
  static readonly ActivityMarkThreadAsReadPath = '/notifications/threads/{thread_id}';

  /**
   * Mark a thread as read.
   *
   * Marks a thread as "read." Marking a thread as "read" is equivalent to clicking a notification in your notification inbox on GitHub: https://github.com/notifications.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `activityMarkThreadAsRead()` instead.
   *
   * This method doesn't expect any request body.
   */
  activityMarkThreadAsRead$Response(params: ActivityMarkThreadAsRead$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return activityMarkThreadAsRead(this.http, this.rootUrl, params, context);
  }

  /**
   * Mark a thread as read.
   *
   * Marks a thread as "read." Marking a thread as "read" is equivalent to clicking a notification in your notification inbox on GitHub: https://github.com/notifications.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `activityMarkThreadAsRead$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  activityMarkThreadAsRead(params: ActivityMarkThreadAsRead$Params, context?: HttpContext): Observable<void> {
    return this.activityMarkThreadAsRead$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `activityGetThreadSubscriptionForAuthenticatedUser()` */
  static readonly ActivityGetThreadSubscriptionForAuthenticatedUserPath = '/notifications/threads/{thread_id}/subscription';

  /**
   * Get a thread subscription for the authenticated user.
   *
   * This checks to see if the current user is subscribed to a thread. You can also [get a repository subscription](https://docs.github.com/rest/activity/watching#get-a-repository-subscription).
   *
   * Note that subscriptions are only generated if a user is participating in a conversation--for example, they've replied to the thread, were **@mentioned**, or manually subscribe to a thread.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `activityGetThreadSubscriptionForAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  activityGetThreadSubscriptionForAuthenticatedUser$Response(params: ActivityGetThreadSubscriptionForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<ThreadSubscription>> {
    return activityGetThreadSubscriptionForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a thread subscription for the authenticated user.
   *
   * This checks to see if the current user is subscribed to a thread. You can also [get a repository subscription](https://docs.github.com/rest/activity/watching#get-a-repository-subscription).
   *
   * Note that subscriptions are only generated if a user is participating in a conversation--for example, they've replied to the thread, were **@mentioned**, or manually subscribe to a thread.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `activityGetThreadSubscriptionForAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  activityGetThreadSubscriptionForAuthenticatedUser(params: ActivityGetThreadSubscriptionForAuthenticatedUser$Params, context?: HttpContext): Observable<ThreadSubscription> {
    return this.activityGetThreadSubscriptionForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<ThreadSubscription>): ThreadSubscription => r.body)
    );
  }

  /** Path part for operation `activitySetThreadSubscription()` */
  static readonly ActivitySetThreadSubscriptionPath = '/notifications/threads/{thread_id}/subscription';

  /**
   * Set a thread subscription.
   *
   * If you are watching a repository, you receive notifications for all threads by default. Use this endpoint to ignore future notifications for threads until you comment on the thread or get an **@mention**.
   *
   * You can also use this endpoint to subscribe to threads that you are currently not receiving notifications for or to subscribed to threads that you have previously ignored.
   *
   * Unsubscribing from a conversation in a repository that you are not watching is functionally equivalent to the [Delete a thread subscription](https://docs.github.com/rest/activity/notifications#delete-a-thread-subscription) endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `activitySetThreadSubscription()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  activitySetThreadSubscription$Response(params: ActivitySetThreadSubscription$Params, context?: HttpContext): Observable<StrictHttpResponse<ThreadSubscription>> {
    return activitySetThreadSubscription(this.http, this.rootUrl, params, context);
  }

  /**
   * Set a thread subscription.
   *
   * If you are watching a repository, you receive notifications for all threads by default. Use this endpoint to ignore future notifications for threads until you comment on the thread or get an **@mention**.
   *
   * You can also use this endpoint to subscribe to threads that you are currently not receiving notifications for or to subscribed to threads that you have previously ignored.
   *
   * Unsubscribing from a conversation in a repository that you are not watching is functionally equivalent to the [Delete a thread subscription](https://docs.github.com/rest/activity/notifications#delete-a-thread-subscription) endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `activitySetThreadSubscription$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  activitySetThreadSubscription(params: ActivitySetThreadSubscription$Params, context?: HttpContext): Observable<ThreadSubscription> {
    return this.activitySetThreadSubscription$Response(params, context).pipe(
      map((r: StrictHttpResponse<ThreadSubscription>): ThreadSubscription => r.body)
    );
  }

  /** Path part for operation `activityDeleteThreadSubscription()` */
  static readonly ActivityDeleteThreadSubscriptionPath = '/notifications/threads/{thread_id}/subscription';

  /**
   * Delete a thread subscription.
   *
   * Mutes all future notifications for a conversation until you comment on the thread or get an **@mention**. If you are watching the repository of the thread, you will still receive notifications. To ignore future notifications for a repository you are watching, use the [Set a thread subscription](https://docs.github.com/rest/activity/notifications#set-a-thread-subscription) endpoint and set `ignore` to `true`.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `activityDeleteThreadSubscription()` instead.
   *
   * This method doesn't expect any request body.
   */
  activityDeleteThreadSubscription$Response(params: ActivityDeleteThreadSubscription$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return activityDeleteThreadSubscription(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete a thread subscription.
   *
   * Mutes all future notifications for a conversation until you comment on the thread or get an **@mention**. If you are watching the repository of the thread, you will still receive notifications. To ignore future notifications for a repository you are watching, use the [Set a thread subscription](https://docs.github.com/rest/activity/notifications#set-a-thread-subscription) endpoint and set `ignore` to `true`.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `activityDeleteThreadSubscription$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  activityDeleteThreadSubscription(params: ActivityDeleteThreadSubscription$Params, context?: HttpContext): Observable<void> {
    return this.activityDeleteThreadSubscription$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `activityListPublicOrgEvents()` */
  static readonly ActivityListPublicOrgEventsPath = '/orgs/{org}/events';

  /**
   * List public organization events.
   *
   *
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `activityListPublicOrgEvents()` instead.
   *
   * This method doesn't expect any request body.
   */
  activityListPublicOrgEvents$Response(params: ActivityListPublicOrgEvents$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Event>>> {
    return activityListPublicOrgEvents(this.http, this.rootUrl, params, context);
  }

  /**
   * List public organization events.
   *
   *
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `activityListPublicOrgEvents$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  activityListPublicOrgEvents(params: ActivityListPublicOrgEvents$Params, context?: HttpContext): Observable<Array<Event>> {
    return this.activityListPublicOrgEvents$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Event>>): Array<Event> => r.body)
    );
  }

  /** Path part for operation `activityListRepoEvents()` */
  static readonly ActivityListRepoEventsPath = '/repos/{owner}/{repo}/events';

  /**
   * List repository events.
   *
   * **Note**: This API is not built to serve real-time use cases. Depending on the time of day, event latency can be anywhere from 30s to 6h.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `activityListRepoEvents()` instead.
   *
   * This method doesn't expect any request body.
   */
  activityListRepoEvents$Response(params: ActivityListRepoEvents$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Event>>> {
    return activityListRepoEvents(this.http, this.rootUrl, params, context);
  }

  /**
   * List repository events.
   *
   * **Note**: This API is not built to serve real-time use cases. Depending on the time of day, event latency can be anywhere from 30s to 6h.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `activityListRepoEvents$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  activityListRepoEvents(params: ActivityListRepoEvents$Params, context?: HttpContext): Observable<Array<Event>> {
    return this.activityListRepoEvents$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Event>>): Array<Event> => r.body)
    );
  }

  /** Path part for operation `activityListRepoNotificationsForAuthenticatedUser()` */
  static readonly ActivityListRepoNotificationsForAuthenticatedUserPath = '/repos/{owner}/{repo}/notifications';

  /**
   * List repository notifications for the authenticated user.
   *
   * Lists all notifications for the current user in the specified repository.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `activityListRepoNotificationsForAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  activityListRepoNotificationsForAuthenticatedUser$Response(params: ActivityListRepoNotificationsForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Thread>>> {
    return activityListRepoNotificationsForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * List repository notifications for the authenticated user.
   *
   * Lists all notifications for the current user in the specified repository.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `activityListRepoNotificationsForAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  activityListRepoNotificationsForAuthenticatedUser(params: ActivityListRepoNotificationsForAuthenticatedUser$Params, context?: HttpContext): Observable<Array<Thread>> {
    return this.activityListRepoNotificationsForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Thread>>): Array<Thread> => r.body)
    );
  }

  /** Path part for operation `activityMarkRepoNotificationsAsRead()` */
  static readonly ActivityMarkRepoNotificationsAsReadPath = '/repos/{owner}/{repo}/notifications';

  /**
   * Mark repository notifications as read.
   *
   * Marks all notifications in a repository as "read" for the current user. If the number of notifications is too large to complete in one request, you will receive a `202 Accepted` status and GitHub will run an asynchronous process to mark notifications as "read." To check whether any "unread" notifications remain, you can use the [List repository notifications for the authenticated user](https://docs.github.com/rest/activity/notifications#list-repository-notifications-for-the-authenticated-user) endpoint and pass the query parameter `all=false`.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `activityMarkRepoNotificationsAsRead()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  activityMarkRepoNotificationsAsRead$Response(params: ActivityMarkRepoNotificationsAsRead$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'message'?: string;
'url'?: string;
}>> {
    return activityMarkRepoNotificationsAsRead(this.http, this.rootUrl, params, context);
  }

  /**
   * Mark repository notifications as read.
   *
   * Marks all notifications in a repository as "read" for the current user. If the number of notifications is too large to complete in one request, you will receive a `202 Accepted` status and GitHub will run an asynchronous process to mark notifications as "read." To check whether any "unread" notifications remain, you can use the [List repository notifications for the authenticated user](https://docs.github.com/rest/activity/notifications#list-repository-notifications-for-the-authenticated-user) endpoint and pass the query parameter `all=false`.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `activityMarkRepoNotificationsAsRead$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  activityMarkRepoNotificationsAsRead(params: ActivityMarkRepoNotificationsAsRead$Params, context?: HttpContext): Observable<{
'message'?: string;
'url'?: string;
}> {
    return this.activityMarkRepoNotificationsAsRead$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'message'?: string;
'url'?: string;
}>): {
'message'?: string;
'url'?: string;
} => r.body)
    );
  }

  /** Path part for operation `activityListStargazersForRepo()` */
  static readonly ActivityListStargazersForRepoPath = '/repos/{owner}/{repo}/stargazers';

  /**
   * List stargazers.
   *
   * Lists the people that have starred the repository.
   *
   * You can also find out _when_ stars were created by passing the following custom [media type](https://docs.github.com/rest/overview/media-types/) via the `Accept` header: `application/vnd.github.star+json`.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `activityListStargazersForRepo()` instead.
   *
   * This method doesn't expect any request body.
   */
  activityListStargazersForRepo$Response(params: ActivityListStargazersForRepo$Params, context?: HttpContext): Observable<StrictHttpResponse<(Array<SimpleUser> | Array<Stargazer>)>> {
    return activityListStargazersForRepo(this.http, this.rootUrl, params, context);
  }

  /**
   * List stargazers.
   *
   * Lists the people that have starred the repository.
   *
   * You can also find out _when_ stars were created by passing the following custom [media type](https://docs.github.com/rest/overview/media-types/) via the `Accept` header: `application/vnd.github.star+json`.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `activityListStargazersForRepo$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  activityListStargazersForRepo(params: ActivityListStargazersForRepo$Params, context?: HttpContext): Observable<(Array<SimpleUser> | Array<Stargazer>)> {
    return this.activityListStargazersForRepo$Response(params, context).pipe(
      map((r: StrictHttpResponse<(Array<SimpleUser> | Array<Stargazer>)>): (Array<SimpleUser> | Array<Stargazer>) => r.body)
    );
  }

  /** Path part for operation `activityListWatchersForRepo()` */
  static readonly ActivityListWatchersForRepoPath = '/repos/{owner}/{repo}/subscribers';

  /**
   * List watchers.
   *
   * Lists the people watching the specified repository.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `activityListWatchersForRepo()` instead.
   *
   * This method doesn't expect any request body.
   */
  activityListWatchersForRepo$Response(params: ActivityListWatchersForRepo$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<SimpleUser>>> {
    return activityListWatchersForRepo(this.http, this.rootUrl, params, context);
  }

  /**
   * List watchers.
   *
   * Lists the people watching the specified repository.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `activityListWatchersForRepo$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  activityListWatchersForRepo(params: ActivityListWatchersForRepo$Params, context?: HttpContext): Observable<Array<SimpleUser>> {
    return this.activityListWatchersForRepo$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<SimpleUser>>): Array<SimpleUser> => r.body)
    );
  }

  /** Path part for operation `activityGetRepoSubscription()` */
  static readonly ActivityGetRepoSubscriptionPath = '/repos/{owner}/{repo}/subscription';

  /**
   * Get a repository subscription.
   *
   * Gets information about whether the authenticated user is subscribed to the repository.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `activityGetRepoSubscription()` instead.
   *
   * This method doesn't expect any request body.
   */
  activityGetRepoSubscription$Response(params: ActivityGetRepoSubscription$Params, context?: HttpContext): Observable<StrictHttpResponse<RepositorySubscription>> {
    return activityGetRepoSubscription(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a repository subscription.
   *
   * Gets information about whether the authenticated user is subscribed to the repository.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `activityGetRepoSubscription$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  activityGetRepoSubscription(params: ActivityGetRepoSubscription$Params, context?: HttpContext): Observable<RepositorySubscription> {
    return this.activityGetRepoSubscription$Response(params, context).pipe(
      map((r: StrictHttpResponse<RepositorySubscription>): RepositorySubscription => r.body)
    );
  }

  /** Path part for operation `activitySetRepoSubscription()` */
  static readonly ActivitySetRepoSubscriptionPath = '/repos/{owner}/{repo}/subscription';

  /**
   * Set a repository subscription.
   *
   * If you would like to watch a repository, set `subscribed` to `true`. If you would like to ignore notifications made within a repository, set `ignored` to `true`. If you would like to stop watching a repository, [delete the repository's subscription](https://docs.github.com/rest/activity/watching#delete-a-repository-subscription) completely.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `activitySetRepoSubscription()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  activitySetRepoSubscription$Response(params: ActivitySetRepoSubscription$Params, context?: HttpContext): Observable<StrictHttpResponse<RepositorySubscription>> {
    return activitySetRepoSubscription(this.http, this.rootUrl, params, context);
  }

  /**
   * Set a repository subscription.
   *
   * If you would like to watch a repository, set `subscribed` to `true`. If you would like to ignore notifications made within a repository, set `ignored` to `true`. If you would like to stop watching a repository, [delete the repository's subscription](https://docs.github.com/rest/activity/watching#delete-a-repository-subscription) completely.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `activitySetRepoSubscription$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  activitySetRepoSubscription(params: ActivitySetRepoSubscription$Params, context?: HttpContext): Observable<RepositorySubscription> {
    return this.activitySetRepoSubscription$Response(params, context).pipe(
      map((r: StrictHttpResponse<RepositorySubscription>): RepositorySubscription => r.body)
    );
  }

  /** Path part for operation `activityDeleteRepoSubscription()` */
  static readonly ActivityDeleteRepoSubscriptionPath = '/repos/{owner}/{repo}/subscription';

  /**
   * Delete a repository subscription.
   *
   * This endpoint should only be used to stop watching a repository. To control whether or not you wish to receive notifications from a repository, [set the repository's subscription manually](https://docs.github.com/rest/activity/watching#set-a-repository-subscription).
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `activityDeleteRepoSubscription()` instead.
   *
   * This method doesn't expect any request body.
   */
  activityDeleteRepoSubscription$Response(params: ActivityDeleteRepoSubscription$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return activityDeleteRepoSubscription(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete a repository subscription.
   *
   * This endpoint should only be used to stop watching a repository. To control whether or not you wish to receive notifications from a repository, [set the repository's subscription manually](https://docs.github.com/rest/activity/watching#set-a-repository-subscription).
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `activityDeleteRepoSubscription$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  activityDeleteRepoSubscription(params: ActivityDeleteRepoSubscription$Params, context?: HttpContext): Observable<void> {
    return this.activityDeleteRepoSubscription$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `activityListReposStarredByAuthenticatedUser()` */
  static readonly ActivityListReposStarredByAuthenticatedUserPath = '/user/starred';

  /**
   * List repositories starred by the authenticated user.
   *
   * Lists repositories the authenticated user has starred.
   *
   * You can also find out _when_ stars were created by passing the following custom [media type](https://docs.github.com/rest/overview/media-types/) via the `Accept` header: `application/vnd.github.star+json`.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `activityListReposStarredByAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  activityListReposStarredByAuthenticatedUser$Response(params?: ActivityListReposStarredByAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<StarredRepository>>> {
    return activityListReposStarredByAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * List repositories starred by the authenticated user.
   *
   * Lists repositories the authenticated user has starred.
   *
   * You can also find out _when_ stars were created by passing the following custom [media type](https://docs.github.com/rest/overview/media-types/) via the `Accept` header: `application/vnd.github.star+json`.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `activityListReposStarredByAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  activityListReposStarredByAuthenticatedUser(params?: ActivityListReposStarredByAuthenticatedUser$Params, context?: HttpContext): Observable<Array<StarredRepository>> {
    return this.activityListReposStarredByAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<StarredRepository>>): Array<StarredRepository> => r.body)
    );
  }

  /** Path part for operation `activityCheckRepoIsStarredByAuthenticatedUser()` */
  static readonly ActivityCheckRepoIsStarredByAuthenticatedUserPath = '/user/starred/{owner}/{repo}';

  /**
   * Check if a repository is starred by the authenticated user.
   *
   * Whether the authenticated user has starred the repository.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `activityCheckRepoIsStarredByAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  activityCheckRepoIsStarredByAuthenticatedUser$Response(params: ActivityCheckRepoIsStarredByAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return activityCheckRepoIsStarredByAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Check if a repository is starred by the authenticated user.
   *
   * Whether the authenticated user has starred the repository.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `activityCheckRepoIsStarredByAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  activityCheckRepoIsStarredByAuthenticatedUser(params: ActivityCheckRepoIsStarredByAuthenticatedUser$Params, context?: HttpContext): Observable<void> {
    return this.activityCheckRepoIsStarredByAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `activityStarRepoForAuthenticatedUser()` */
  static readonly ActivityStarRepoForAuthenticatedUserPath = '/user/starred/{owner}/{repo}';

  /**
   * Star a repository for the authenticated user.
   *
   * Note that you'll need to set `Content-Length` to zero when calling out to this endpoint. For more information, see "[HTTP verbs](https://docs.github.com/rest/overview/resources-in-the-rest-api#http-verbs)."
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `activityStarRepoForAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  activityStarRepoForAuthenticatedUser$Response(params: ActivityStarRepoForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return activityStarRepoForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Star a repository for the authenticated user.
   *
   * Note that you'll need to set `Content-Length` to zero when calling out to this endpoint. For more information, see "[HTTP verbs](https://docs.github.com/rest/overview/resources-in-the-rest-api#http-verbs)."
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `activityStarRepoForAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  activityStarRepoForAuthenticatedUser(params: ActivityStarRepoForAuthenticatedUser$Params, context?: HttpContext): Observable<void> {
    return this.activityStarRepoForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `activityUnstarRepoForAuthenticatedUser()` */
  static readonly ActivityUnstarRepoForAuthenticatedUserPath = '/user/starred/{owner}/{repo}';

  /**
   * Unstar a repository for the authenticated user.
   *
   * Unstar a repository that the authenticated user has previously starred.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `activityUnstarRepoForAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  activityUnstarRepoForAuthenticatedUser$Response(params: ActivityUnstarRepoForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return activityUnstarRepoForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Unstar a repository for the authenticated user.
   *
   * Unstar a repository that the authenticated user has previously starred.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `activityUnstarRepoForAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  activityUnstarRepoForAuthenticatedUser(params: ActivityUnstarRepoForAuthenticatedUser$Params, context?: HttpContext): Observable<void> {
    return this.activityUnstarRepoForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `activityListWatchedReposForAuthenticatedUser()` */
  static readonly ActivityListWatchedReposForAuthenticatedUserPath = '/user/subscriptions';

  /**
   * List repositories watched by the authenticated user.
   *
   * Lists repositories the authenticated user is watching.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `activityListWatchedReposForAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  activityListWatchedReposForAuthenticatedUser$Response(params?: ActivityListWatchedReposForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<MinimalRepository>>> {
    return activityListWatchedReposForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * List repositories watched by the authenticated user.
   *
   * Lists repositories the authenticated user is watching.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `activityListWatchedReposForAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  activityListWatchedReposForAuthenticatedUser(params?: ActivityListWatchedReposForAuthenticatedUser$Params, context?: HttpContext): Observable<Array<MinimalRepository>> {
    return this.activityListWatchedReposForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<MinimalRepository>>): Array<MinimalRepository> => r.body)
    );
  }

  /** Path part for operation `activityListEventsForAuthenticatedUser()` */
  static readonly ActivityListEventsForAuthenticatedUserPath = '/users/{username}/events';

  /**
   * List events for the authenticated user.
   *
   * If you are authenticated as the given user, you will see your private events. Otherwise, you'll only see public events.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `activityListEventsForAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  activityListEventsForAuthenticatedUser$Response(params: ActivityListEventsForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Event>>> {
    return activityListEventsForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * List events for the authenticated user.
   *
   * If you are authenticated as the given user, you will see your private events. Otherwise, you'll only see public events.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `activityListEventsForAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  activityListEventsForAuthenticatedUser(params: ActivityListEventsForAuthenticatedUser$Params, context?: HttpContext): Observable<Array<Event>> {
    return this.activityListEventsForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Event>>): Array<Event> => r.body)
    );
  }

  /** Path part for operation `activityListOrgEventsForAuthenticatedUser()` */
  static readonly ActivityListOrgEventsForAuthenticatedUserPath = '/users/{username}/events/orgs/{org}';

  /**
   * List organization events for the authenticated user.
   *
   * This is the user's organization dashboard. You must be authenticated as the user to view this.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `activityListOrgEventsForAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  activityListOrgEventsForAuthenticatedUser$Response(params: ActivityListOrgEventsForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Event>>> {
    return activityListOrgEventsForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * List organization events for the authenticated user.
   *
   * This is the user's organization dashboard. You must be authenticated as the user to view this.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `activityListOrgEventsForAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  activityListOrgEventsForAuthenticatedUser(params: ActivityListOrgEventsForAuthenticatedUser$Params, context?: HttpContext): Observable<Array<Event>> {
    return this.activityListOrgEventsForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Event>>): Array<Event> => r.body)
    );
  }

  /** Path part for operation `activityListPublicEventsForUser()` */
  static readonly ActivityListPublicEventsForUserPath = '/users/{username}/events/public';

  /**
   * List public events for a user.
   *
   *
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `activityListPublicEventsForUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  activityListPublicEventsForUser$Response(params: ActivityListPublicEventsForUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Event>>> {
    return activityListPublicEventsForUser(this.http, this.rootUrl, params, context);
  }

  /**
   * List public events for a user.
   *
   *
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `activityListPublicEventsForUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  activityListPublicEventsForUser(params: ActivityListPublicEventsForUser$Params, context?: HttpContext): Observable<Array<Event>> {
    return this.activityListPublicEventsForUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Event>>): Array<Event> => r.body)
    );
  }

  /** Path part for operation `activityListReceivedEventsForUser()` */
  static readonly ActivityListReceivedEventsForUserPath = '/users/{username}/received_events';

  /**
   * List events received by the authenticated user.
   *
   * These are events that you've received by watching repos and following users. If you are authenticated as the given user, you will see private events. Otherwise, you'll only see public events.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `activityListReceivedEventsForUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  activityListReceivedEventsForUser$Response(params: ActivityListReceivedEventsForUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Event>>> {
    return activityListReceivedEventsForUser(this.http, this.rootUrl, params, context);
  }

  /**
   * List events received by the authenticated user.
   *
   * These are events that you've received by watching repos and following users. If you are authenticated as the given user, you will see private events. Otherwise, you'll only see public events.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `activityListReceivedEventsForUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  activityListReceivedEventsForUser(params: ActivityListReceivedEventsForUser$Params, context?: HttpContext): Observable<Array<Event>> {
    return this.activityListReceivedEventsForUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Event>>): Array<Event> => r.body)
    );
  }

  /** Path part for operation `activityListReceivedPublicEventsForUser()` */
  static readonly ActivityListReceivedPublicEventsForUserPath = '/users/{username}/received_events/public';

  /**
   * List public events received by a user.
   *
   *
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `activityListReceivedPublicEventsForUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  activityListReceivedPublicEventsForUser$Response(params: ActivityListReceivedPublicEventsForUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Event>>> {
    return activityListReceivedPublicEventsForUser(this.http, this.rootUrl, params, context);
  }

  /**
   * List public events received by a user.
   *
   *
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `activityListReceivedPublicEventsForUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  activityListReceivedPublicEventsForUser(params: ActivityListReceivedPublicEventsForUser$Params, context?: HttpContext): Observable<Array<Event>> {
    return this.activityListReceivedPublicEventsForUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Event>>): Array<Event> => r.body)
    );
  }

  /** Path part for operation `activityListReposStarredByUser()` */
  static readonly ActivityListReposStarredByUserPath = '/users/{username}/starred';

  /**
   * List repositories starred by a user.
   *
   * Lists repositories a user has starred.
   *
   * You can also find out _when_ stars were created by passing the following custom [media type](https://docs.github.com/rest/overview/media-types/) via the `Accept` header: `application/vnd.github.star+json`.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `activityListReposStarredByUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  activityListReposStarredByUser$Response(params: ActivityListReposStarredByUser$Params, context?: HttpContext): Observable<StrictHttpResponse<(Array<StarredRepository> | Array<Repository>)>> {
    return activityListReposStarredByUser(this.http, this.rootUrl, params, context);
  }

  /**
   * List repositories starred by a user.
   *
   * Lists repositories a user has starred.
   *
   * You can also find out _when_ stars were created by passing the following custom [media type](https://docs.github.com/rest/overview/media-types/) via the `Accept` header: `application/vnd.github.star+json`.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `activityListReposStarredByUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  activityListReposStarredByUser(params: ActivityListReposStarredByUser$Params, context?: HttpContext): Observable<(Array<StarredRepository> | Array<Repository>)> {
    return this.activityListReposStarredByUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<(Array<StarredRepository> | Array<Repository>)>): (Array<StarredRepository> | Array<Repository>) => r.body)
    );
  }

  /** Path part for operation `activityListReposWatchedByUser()` */
  static readonly ActivityListReposWatchedByUserPath = '/users/{username}/subscriptions';

  /**
   * List repositories watched by a user.
   *
   * Lists repositories a user is watching.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `activityListReposWatchedByUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  activityListReposWatchedByUser$Response(params: ActivityListReposWatchedByUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<MinimalRepository>>> {
    return activityListReposWatchedByUser(this.http, this.rootUrl, params, context);
  }

  /**
   * List repositories watched by a user.
   *
   * Lists repositories a user is watching.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `activityListReposWatchedByUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  activityListReposWatchedByUser(params: ActivityListReposWatchedByUser$Params, context?: HttpContext): Observable<Array<MinimalRepository>> {
    return this.activityListReposWatchedByUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<MinimalRepository>>): Array<MinimalRepository> => r.body)
    );
  }

}
