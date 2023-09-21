import { CollectionReference, DocumentReference } from 'firebase-admin/firestore';
import { firestoreService } from '../config';

/**
 * find Tasks
 * @param {string} spaceId Space identifier
 * @return {DocumentReference} document reference to the space
 */
export function findTokens(spaceId: string): CollectionReference {
  return firestoreService.collection(`spaces/${spaceId}/tokens`);
}

/**
 * find Task by ID
 * @param {string} spaceId Space identifier
 * @param {string} id Token identifier
 * @return {DocumentReference} document reference to the space
 */
export function findTokenById(spaceId: string, id: string): DocumentReference {
  return firestoreService.doc(`spaces/${spaceId}/tokens/${id}`);
}

/**
 * validate Token
 * @param {any} token token
 * @return {boolean} true - token is valid, false - otherwise
 */
export function validateToken(token?: unknown): boolean {
  return token !== undefined && typeof token === 'string' && token.length === 20;
}
