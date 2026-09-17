import { Asset } from '@shared/models/asset.model';
import { AssetFileType } from '@shared/models/schema.model';

export interface AssetsSelectDialogContext {
  spaceId: string;
  multiple?: boolean;
  fileType?: AssetFileType;
}

export type AssetsSelectDialogResult = Asset[];
