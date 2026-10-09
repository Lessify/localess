import { AssetFile } from '@shared/models/asset.model';

export interface EditFileDialogContext {
  asset: AssetFile;
  reservedNames: string[];
}

export interface EditFileDialogResult {
  name: string;
  alt?: string;
}
