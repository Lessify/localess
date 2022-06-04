import {Timestamp} from 'firebase-admin/firestore';
import {Locale} from './locale.model';

export interface Space {
  id: string;
  name: string;
  locales: Locale[];
  localeFallback: Locale;
  createdOn: Timestamp;
  updatedOn: Timestamp;
}
