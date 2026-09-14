import { Timestamp } from 'firebase-admin/firestore';

export type Asset = AssetFile | AssetFolder;

export enum AssetKind {
  FOLDER = 'FOLDER',
  FILE = 'FILE',
}

export interface AssetBase {
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
  metadata?: AssetFileMetadata;
  source?: string;
}

export type AssetFileMetadata =
  | {
      format?: string;
      width?: number;
      height?: number;
      orientation?: 'landscape' | 'portrait' | 'squarish';
    }
  | {
      type: 'image';
      format?: string;
      width?: number;
      height?: number;
      orientation?: 'landscape' | 'portrait' | 'squarish';
      /**
       * Playback length in **whole seconds**, for animated images.
       *
       * Normalised once, where metadata is generated, rather than at every read — exiftool reports
       * this as a number for some containers and a clock string (`'00:01:05.161'`) for others, and
       * the two branches used to disagree about which to store.
       *
       * Documents written before that was unified may still hold a string despite this type. The
       * space's regenerate-metadata task rewrites them.
       */
      duration?: number;
      /**
       * Frame count, recorded only for genuine animations.
       *
       * A static GIF reports one page and a static WebP reports none, so storing the raw value
       * would make the field's presence meaningless. Held on the document so the transform route
       * can reject an oversized animation *before* downloading it, rather than downloading and
       * probing to find out.
       */
      pages?: number;
      /** Whether the image carries an alpha channel, so a consumer knows a background matters. */
      hasAlpha?: boolean;
    }
  | {
      type: 'video';
      format?: string;
      width?: number;
      height?: number;
      orientation?: 'landscape' | 'portrait' | 'squarish';
      /** Playback length in **whole seconds**. See the note on the image variant above. */
      duration?: number;
    };

// Import and Export
export interface AssetFolderExport extends Omit<AssetFolder, 'createdAt' | 'updatedAt'> {
  id: string;
}

export interface AssetFileExport extends Omit<AssetFile, 'createdAt' | 'updatedAt' | 'inProgress'> {
  id: string;
}

export type AssetExport = AssetFileExport | AssetFolderExport;
