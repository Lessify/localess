import {CollectionReference, DocumentReference} from 'firebase-admin/firestore';
import {firestoreService} from '../config';

/**
 * find Plugins
 * @param {string} spaceId Space identifier
 * @return {DocumentReference} document reference
 */
export function findPlugins(spaceId: string): CollectionReference {
  return firestoreService.collection(`spaces/${spaceId}/plugins`);
}

/**
 * find Plugin by ID
 * @param {string} spaceId Space identifier
 * @param {string} id Plugin identifier
 * @return {DocumentReference} document reference
 */
export function findPluginById(spaceId: string, id: string): DocumentReference {
  return firestoreService.doc(`spaces/${spaceId}/plugins/${id}`);
}
