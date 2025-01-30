import { FieldValue, Timestamp } from '@angular/fire/firestore';

export type Asset = AssetFile | AssetFolder;

export enum AssetKind {
  FOLDER = 'FOLDER',
  FILE = 'FILE',
}

export interface AssetBase {
  id: string;
  kind: AssetKind;
  name: string;
  parentPath: string;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AssetFolder extends AssetBase {
  kind: AssetKind.FOLDER;
}

export interface AssetFile extends AssetBase {
  kind: AssetKind.FILE;
  inProgress?: boolean;
  extension: string;
  type: string;
  size: number;
  alt?: string;
  metadata?: AssetMetadata;
  source?: string;
}

export interface AssetMetadata {
  format?: string;
  width?: number;
  height?: number;
  orientation?: 'landscape' | 'portrait' | 'squarish';
  animated?: boolean;
}

// Common image file types
export const webImages: Record<string, string> = {
  // Suggested one
  '.apng':
    'Good choice for lossless animation sequences (GIF is less performant). AVIF and WebP have better performance but less broad browser support. Supported: Chrome, Edge, Firefox, Opera, Safari.',
  '.avif':
    'Good choice for both images and animated images due to high performance and royalty free image format. It offers much better compression than PNG or JPEG with support for higher color depths, animated frames, transparency, etc. Note that when using AVIF, you should include fallbacks to formats with better browser support. Supported: Chrome, Firefox (still images only: animated images not implemented), Opera, Safari.',
  '.gif':
    'Good choice for simple images and animations. Prefer PNG for lossless and indexed still images, and consider WebP, AVIF or APNG for animation sequences. Supported: Chrome, Edge, Firefox, IE, Opera, Safari.',
  '.jpg':
    'Good choice for lossy compression of still images (currently the most popular). Prefer PNG when more precise reproduction of the image is required, or WebP/AVIF if both better reproduction and higher compression are required. Support: Chrome, Edge, Firefox, IE, Opera, Safari.',
  '.jpeg':
    'Good choice for lossy compression of still images (currently the most popular). Prefer PNG when more precise reproduction of the image is required, or WebP/AVIF if both better reproduction and higher compression are required. Support: Chrome, Edge, Firefox, IE, Opera, Safari.',
  '.jfif':
    'Good choice for lossy compression of still images (currently the most popular). Prefer PNG when more precise reproduction of the image is required, or WebP/AVIF if both better reproduction and higher compression are required. Support: Chrome, Edge, Firefox, IE, Opera, Safari.',
  '.pjpeg':
    'Good choice for lossy compression of still images (currently the most popular). Prefer PNG when more precise reproduction of the image is required, or WebP/AVIF if both better reproduction and higher compression are required. Support: Chrome, Edge, Firefox, IE, Opera, Safari.',
  '.pjp':
    'Good choice for lossy compression of still images (currently the most popular). Prefer PNG when more precise reproduction of the image is required, or WebP/AVIF if both better reproduction and higher compression are required. Support: Chrome, Edge, Firefox, IE, Opera, Safari.',
  '.png':
    'PNG is preferred over JPEG for more precise reproduction of source images, or when transparency is needed. WebP/AVIF provide even better compression and reproduction, but browser support is more limited. Support: Chrome, Edge, Firefox, IE, Opera, Safari.',
  '.svg':
    'Vector image format; ideal for user interface elements, icons, diagrams, etc., that must be drawn accurately at different sizes. Support: Chrome, Edge, Firefox, IE, Opera, Safari.',
  '.webp':
    'Excellent choice for both images and animated images. WebP offers much better compression than PNG or JPEG with support for higher color depths, animated frames, transparency etc. AVIF offers slightly better compression, but is not quite as well-supported in browsers and does not support progressive rendering. Support: Chrome, Edge, Firefox, Opera, Safari',
  // Slow one
  '.bmp': 'Chrome, Edge, Firefox, IE, Opera, Safari',
  '.ico': 'Chrome, Edge, Firefox, IE, Opera, Safari',
  '.cur': 'Chrome, Edge, Firefox, IE, Opera, Safari',
  '.tif': 'Safari',
  '.tiff': 'Safari',
};

export interface AssetFolderCreate {
  name: string;
}

export interface AssetFolderUpdate {
  name: string;
}

export interface AssetFileUpdate {
  name: string;
}

export interface AssetFileCreate {
  name: string;
}

// Firestore

export interface AssetCreateFS {
  kind: AssetKind;
  name: string;
  parentPath: string;
  createdAt: FieldValue;
  updatedAt: FieldValue;
}

export interface AssetFileCreateFS extends AssetCreateFS {
  kind: AssetKind.FILE;
  inProgress: true;
  extension: string;
  type: string;
  size: number;
  alt?: string;
  source?: string;
}

export interface AssetFolderCreateFS extends AssetCreateFS {
  kind: AssetKind.FOLDER;
}

export type AssetFileImport = {
  url: string;
  name: string;
  extension: string;
  alt?: string;
  source?: string;
};
