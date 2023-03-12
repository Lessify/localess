import {firestoreService} from '../config';
import {DocumentReference, Query} from 'firebase-admin/firestore';

export function findContentByFullSlug(spaceId: string, fullSlug: string): Query {
  return firestoreService.collection(`spaces/${spaceId}/contents`)
    .where('fullSlug', '==', fullSlug).limit(1);
}

export function findContentById(spaceId: string, id: string): DocumentReference {
  return firestoreService.doc(`spaces/${spaceId}/contents/${id}`);
}
