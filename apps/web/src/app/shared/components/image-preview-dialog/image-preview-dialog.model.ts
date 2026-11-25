import { AssetFileSummary } from '@localess/shared';

export interface ImagePreviewDialogContext {
  spaceId: string;
  /** A file of the list, or of `SpaceStore`'s light list: what the preview shows is in both. */
  asset: AssetFileSummary;
}
