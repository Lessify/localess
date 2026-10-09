import { AssetFile } from '@localess/shared';

export interface EditFileDialogContext {
  asset: AssetFile;
  reservedNames: string[];
}

export interface EditFileDialogResult {
  name: string;
  alt?: string;
}
