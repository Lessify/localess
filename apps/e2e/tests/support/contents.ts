import type { APIRequestContext } from '@playwright/test';

import type { AppApi, ContentDto, SchemaFieldInput } from './app-api';
import { type TestSpace, uniqueId } from './fixtures';

export interface ContentRow extends ContentDto {
  parentId?: string;
  publishedAt?: string;
  updatedAt: string;
  data?: Record<string, unknown>;
}

/** A Root schema for documents; `fields` default to a translatable title. */
export async function pageSchema(
  api: AppApi,
  space: TestSpace,
  fields: SchemaFieldInput[] = [{ name: 'title', kind: 'TEXT', displayName: 'Title', translatable: true }],
  displayName = 'Page',
): Promise<{ id: string; name: string; displayName: string }> {
  const name = uniqueId('Page');
  const schema = await api.createSchema(space.id, { name, type: 'ROOT', displayName, fields });
  return { id: schema.id, name, displayName };
}

/** The contents directly in a folder (no `parentId`: the root). */
export function contentsIn(api: AppApi, spaceId: string, parentId?: string): Promise<ContentRow[]> {
  return api.everyPageOf(`/api/app/spaces/${spaceId}/contents${parentId ? `?parentId=${parentId}` : ''}`);
}

export async function contentNamed(api: AppApi, spaceId: string, name: string): Promise<ContentRow | undefined> {
  const all = await api.everyPageOf<ContentRow>(`/api/app/spaces/${spaceId}/contents?deep=true`);
  return all.find(it => it.name === name);
}

export function contentById(api: AppApi, spaceId: string, id: string): Promise<ContentRow> {
  return api.get(`/api/app/spaces/${spaceId}/contents/${id}`);
}

/** A CDN client for one space: a public and a preview token, made once. */
export class Cdn {
  private tokens?: { pub: string; prv: string };
  constructor(
    private readonly request: APIRequestContext,
    private readonly api: AppApi,
    private readonly spaceId: string,
  ) {}

  private async token(preview: boolean): Promise<string> {
    if (!this.tokens) {
      const pub = (await this.api.createToken(this.spaceId, { name: 'CDN public', type: 'public' })).token;
      const prv = (await this.api.createToken(this.spaceId, { name: 'CDN preview', type: 'preview' })).token;
      this.tokens = { pub, prv };
    }
    return preview ? this.tokens.prv : this.tokens.pub;
  }

  /** A document by full slug or id: the JSON, or the status when there is none. */
  async get(path: { slug: string } | { id: string }, params: Record<string, string> = {}): Promise<{ status: number; body?: CdnDocument }> {
    const preview = params['version'] === 'draft';
    const query = new URLSearchParams({ ...params, token: await this.token(preview) });
    const url =
      'slug' in path
        ? `/api/v1/spaces/${this.spaceId}/contents/slugs/${path.slug}?${query}`
        : `/api/v1/spaces/${this.spaceId}/contents/${path.id}?${query}`;
    const response = await this.request.get(url);
    return response.ok() ? { status: 200, body: (await response.json()) as CdnDocument } : { status: response.status() };
  }

  /** The `/links` index: published documents and folders by id. */
  async links(params: Record<string, string> = {}): Promise<Record<string, { fullSlug: string; kind: string; name: string }>> {
    const query = new URLSearchParams({ ...params, token: await this.token(params['version'] === 'draft') });
    const response = await this.request.get(`/api/v1/spaces/${this.spaceId}/links?${query}`);
    return (await response.json()) as Record<string, { fullSlug: string; kind: string; name: string }>;
  }
}

export interface CdnDocument {
  id: string;
  name: string;
  slug: string;
  fullSlug: string;
  locale: string;
  data: Record<string, unknown>;
  links?: Record<string, unknown>;
  references?: Record<string, unknown>;
  assets?: Record<string, unknown>;
}
