import {FieldValue, Timestamp} from '@angular/fire/firestore';
import {Locale} from './locale.model';

export interface Space {
  id: string;
  name: string;
  locales: Locale[];
  localeFallback: Locale;
  createdAt: Timestamp;
  updatedAt: Timestamp;
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

export interface SpaceUpdateFS {
  name: string;
  updatedAt: FieldValue;
}

export interface SpaceLocalesUpdateFS {
  locales: FieldValue;
  updatedAt: FieldValue;
}

export interface SpaceFallbackLocaleUpdateFS {
  localeFallback: Locale;
  updatedAt: FieldValue;
}
