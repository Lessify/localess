import {firestoreService} from '../config';
import {DocumentReference} from 'firebase-admin/firestore';

export function findSpaceById(spaceId: string): DocumentReference {
  return firestoreService.doc(`spaces/${spaceId}`);
}
