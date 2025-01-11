import { AssetFile } from '@shared/models/asset.model';

export interface EditFileDialogModel {
  asset: AssetFile;
  reservedNames: string[];
}
