import { Asset, AssetFileType } from '@localess/shared';

export interface AssetsSelectDialogContext {
  spaceId: string;
  multiple?: boolean;
  fileType?: AssetFileType;
}

export type AssetsSelectDialogResult = Asset[];
