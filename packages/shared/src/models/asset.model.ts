import type { Timestamp } from './timestamp.js';

export type Asset = AssetFile | AssetFolder;

export enum AssetKind {
  FOLDER = 'FOLDER',
  FILE = 'FILE',
}

export interface AssetBase {
  id: string;
  /**
   * Firestore id of an asset imported from Firebase, for display. Old asset URLs redirect to the UUID one, and
   * content imported from Firebase may still reference the asset by it.
   */
  legacyId?: string;
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

export function isFolder(asset: Asset): asset is AssetFolder {
  return asset.kind === AssetKind.FOLDER;
}

export function isFile(asset: Asset): asset is AssetFile {
  return asset.kind === AssetKind.FILE;
}

// Import and Export
export type AssetFolderExport = Omit<AssetFolder, 'createdAt' | 'updatedAt'>;

export type AssetFileExport = Omit<AssetFile, 'createdAt' | 'updatedAt' | 'inProgress'>;

export type AssetExport = AssetFileExport | AssetFolderExport;
