import {firestoreService} from '../config';
import {CollectionReference, DocumentReference, Query} from 'firebase-admin/firestore';

/**
 * find Content by Full Slug
 * @param {string} spaceId Space identifier
 * @param {string} fullSlug Full Slug path
 * @return {DocumentReference} document reference to the space
 */
export function findContentByFullSlug(spaceId: string, fullSlug: string): Query {
  return firestoreService.collection(`spaces/${spaceId}/contents`)
    .where('fullSlug', '==', fullSlug).limit(1);
}

/**
 * find Content by ID
 * @param {string} spaceId Space identifier
 * @param {string} id Content identifier
 * @return {DocumentReference} document reference to the space
 */
export function findContentById(spaceId: string, id: string): DocumentReference {
  return firestoreService.doc(`spaces/${spaceId}/contents/${id}`);
}

/**
 * find Contents
 * @param {string} spaceId Space identifier
 * @return {CollectionReference} collection
 */
export function findContents(spaceId: string): CollectionReference {
  return firestoreService.collection(`spaces/${spaceId}/assets`);
}
