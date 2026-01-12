import { DocumentReference, Query } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { firestoreService } from '../config';
import { WebHookEvent } from '../models';

/**
 * find WebHook by ID
 * @param {string} spaceId Space identifier
 * @param {string} id WebHook identifier
 * @return {DocumentReference} document reference to the webhook
 */
export function findWebHookById(spaceId: string, id: string): DocumentReference {
  logger.info(`[findWebHookById] spaceId=${spaceId} id=${id}`);
  return firestoreService.doc(`spaces/${spaceId}/webhooks/${id}`);
}

/**
 * find all WebHooks by Space ID
 * @param {string} spaceId Space identifier
 * @return {Query} collection query
 */
export function findAllWebHooks(spaceId: string): Query {
  logger.info(`[findAllWebHooks] spaceId=${spaceId}`);
  return firestoreService.collection(`spaces/${spaceId}/webhooks`);
}

/**
 * find enabled WebHooks by Space ID and Event
 * @param {string} spaceId Space identifier
 * @param {WebHookEvent} event Event type
 * @return {Query} collection query
 */
export function findEnabledWebHooksByEvent(spaceId: string, event: WebHookEvent): Query {
  logger.info(`[findEnabledWebHooksByEvent] spaceId=${spaceId} event=${event}`);
  return firestoreService
    .collection(`spaces/${spaceId}/webhooks`)
    .where('enabled', '==', true)
    .where('events', 'array-contains', event);
}

/**
 * find WebHook logs
 * @param {string} spaceId Space identifier
 * @param {string} webhookId WebHook identifier
 * @return {Query} collection query
 */
export function findWebHookLogs(spaceId: string, webhookId: string): Query {
  logger.info(`[findWebHookLogs] spaceId=${spaceId} webhookId=${webhookId}`);
  return firestoreService
    .collection(`spaces/${spaceId}/webhooks/${webhookId}/logs`)
    .orderBy('createdAt', 'desc')
    .limit(100);
}
