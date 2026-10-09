import { AssetFolder } from '@localess/shared';

export interface EditFolderDialogContext {
  asset: AssetFolder;
  reservedNames: string[];
}

export interface EditFolderDialogResult {
  name: string;
}
