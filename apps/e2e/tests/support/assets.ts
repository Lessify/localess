import { type APIRequestContext, expect } from '@playwright/test';

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
  return api.everyPageOf(`/api/app/spaces/${spaceId}/assets${parentId ? `?parentId=${parentId}` : ''}`);
}

/** Every asset of the space, in any folder. */
export function allAssets(api: AppApi, spaceId: string): Promise<AssetDto[]> {
  return api.everyPageOf(`/api/app/spaces/${spaceId}/assets?deep=true`);
}

/** The name the app lists: `hero.png` for a file (name and extension), `Images` for a folder. */
export function listedName(asset: AssetDto): string {
  return asset.kind === 'FILE' ? `${asset.name}${asset.extension ?? ''}` : asset.name;
}

/**
 * The asset directly in a folder with this listed name: `hero.png` for a file, `Images` for a folder. Fails when two
 * have it (names may repeat, docs/roadmap/asset-names.md): such a test looks at `assetsIn` itself.
 */
export async function assetNamed(api: AppApi, spaceId: string, name: string, parentId?: string): Promise<AssetDto | undefined> {
  const matches = (await assetsIn(api, spaceId, parentId)).filter(it => listedName(it) === name);
  expect(matches.length, `assets named ${name}`).toBeLessThanOrEqual(1);
  return matches[0];
}

/** The stored bytes from the CDN API (public, no token), or the status when there are none. */
export async function original(request: APIRequestContext, spaceId: string, id: string): Promise<Buffer | number> {
  const response = await request.get(`/api/v1/spaces/${spaceId}/assets/${id}/original`);
  return response.ok() ? response.body() : response.status();
}
