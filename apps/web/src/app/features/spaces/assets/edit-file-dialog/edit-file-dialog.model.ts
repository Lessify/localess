import { AssetFile } from '@localess/shared';

export interface EditFileDialogContext {
  asset: AssetFile;
}

export interface EditFileDialogResult {
  name: string;
  alt?: string;
}
