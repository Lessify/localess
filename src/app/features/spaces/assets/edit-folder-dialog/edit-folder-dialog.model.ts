import { AssetFolder } from '@shared/models/asset.model';

export interface EditFolderDialogModel {
  asset: AssetFolder;
  reservedNames: string[];
}
