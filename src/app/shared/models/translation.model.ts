import firebase from 'firebase/compat';
import Timestamp = firebase.firestore.Timestamp;

enum TranslationType {
  STRING = 'STRING',
  PLURAL = 'PLURAL',
  ARRAY = 'ARRAY'
}

export interface Translation {
  id: string;
  type: TranslationType;
  locales: { [key: string]: string };
  labels: string[]
  description: string;
  createdOn: Timestamp | firebase.firestore.FieldValue;
  updatedOn: Timestamp | firebase.firestore.FieldValue;
}
