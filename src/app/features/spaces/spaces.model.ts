import firebase from 'firebase/compat';
import Timestamp = firebase.firestore.Timestamp;

export interface Space {
  id: string;
  name: string;
  createdOn: Timestamp | firebase.firestore.FieldValue;
  updatedOn: Timestamp | firebase.firestore.FieldValue;
}
