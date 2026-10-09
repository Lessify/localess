import { UnsplashPhoto } from '@shared/models/unsplash-plugin.model';

export interface UnsplashAssetsSelectDialogContext {
  spaceId: string;
  multiple?: boolean;
}

export type UnsplashAssetsSelectDialogResult = UnsplashPhoto[];
