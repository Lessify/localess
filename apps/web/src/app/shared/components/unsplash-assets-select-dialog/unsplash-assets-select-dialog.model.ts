import { UnsplashPhoto } from '@localess/shared';

export interface UnsplashAssetsSelectDialogContext {
  spaceId: string;
  multiple?: boolean;
}

export type UnsplashAssetsSelectDialogResult = UnsplashPhoto[];
