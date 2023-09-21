import { FieldValue, Timestamp } from '@angular/fire/firestore';
import { Locale } from './locale.model';
import { ThemePalette } from '@angular/material/core';

export interface Space {
  id: string;
  name: string;
  // Locales
  locales: Locale[];
  localeFallback: Locale;
  // Environments
  environments?: SpaceEnvironment[];
  // UI
  ui?: SpaceUi;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SpaceEnvironment {
  name: string;
  url: string;
}

export interface SpaceUi {
  color?: ThemePalette;
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

export interface SpaceUiUpdate {
  color?: ThemePalette;
}
