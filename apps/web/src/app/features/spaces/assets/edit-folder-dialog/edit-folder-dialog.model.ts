import { AssetFolder } from '@shared/models/asset.model';

export interface EditFolderDialogContext {
  asset: AssetFolder;
  reservedNames: string[];
}

export interface EditFolderDialogResult {
  name: string;
}
