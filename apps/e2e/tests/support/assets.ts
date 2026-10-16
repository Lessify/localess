import type { APIRequestContext } from '@playwright/test';

import type { AppApi } from './app-api';

export interface AssetDto {
  id: string;
  kind: 'FILE' | 'FOLDER';
  name: string;
  extension?: string;
  type?: string;
  size?: number;
  alt?: string;
  parentId?: string;
}

/** The assets directly in a folder (no `parentId`: the root). */
export function assetsIn(api: AppApi, spaceId: string, parentId?: string): Promise<AssetDto[]> {
  return api.get(`/api/app/spaces/${spaceId}/assets?parentId=${parentId ?? ''}`);
}

/** Every asset of the space, in any folder. */
export function allAssets(api: AppApi, spaceId: string): Promise<AssetDto[]> {
  return api.get(`/api/app/spaces/${spaceId}/assets`);
}

/** The asset with this name (without extension) directly in a folder. */
export async function assetNamed(api: AppApi, spaceId: string, name: string, parentId?: string): Promise<AssetDto | undefined> {
  return (await assetsIn(api, spaceId, parentId)).find(it => it.name === name);
}

/** The stored bytes from the CDN API (public, no token), or the status when there are none. */
export async function original(request: APIRequestContext, spaceId: string, id: string): Promise<Buffer | number> {
  const response = await request.get(`/api/v1/spaces/${spaceId}/assets/${id}/original`);
  return response.ok() ? response.body() : response.status();
}
