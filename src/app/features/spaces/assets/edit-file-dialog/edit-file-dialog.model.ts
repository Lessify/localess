import { Asset } from '@shared/models/asset.model';

export interface EditFileDialogModel {
  asset: Asset;
  reservedNames: string[];
}
