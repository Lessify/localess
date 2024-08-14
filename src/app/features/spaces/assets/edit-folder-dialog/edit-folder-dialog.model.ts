import { Asset } from '@shared/models/asset.model';

export interface EditFolderDialogModel {
  asset: Asset;
  reservedNames: string[];
}
