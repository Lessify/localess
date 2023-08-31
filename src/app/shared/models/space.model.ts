import {FieldValue, Timestamp} from '@angular/fire/firestore';
import {Locale} from './locale.model';

export interface Space {
  id: string;
  name: string;
  // Locales
  locales: Locale[];
  localeFallback: Locale;
  // Environments
  environments?: SpaceEnvironment[];

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SpaceEnvironment {
  name: string
  url: string
}

export interface SpaceCreate {
  name: string;
}

export interface SpaceCreateFS {
  name: string;
  locales: Locale[];
  localeFallback: Locale;
  createdAt: FieldValue;
  updatedAt: FieldValue;
}

export interface SpaceUpdate {
  name: string;
}
