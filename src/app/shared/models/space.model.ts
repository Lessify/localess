import {FieldValue, Timestamp} from '@angular/fire/firestore';
import {Locale} from './locale.model';

export interface Space {
  id: string;
  name: string;
  locales: Locale[];
  localeFallback: Locale;
  createdOn: Timestamp;
  updatedOn: Timestamp;
}

export interface SpaceCreate {
  name: string;
  locales: Locale[];
  localeFallback: Locale;
  createdOn: FieldValue;
  updatedOn: FieldValue;
}

export interface SpaceUpdate {
  name: string;
  locales: FieldValue;
  localeFallback: Locale;
  updatedOn: FieldValue;
}
