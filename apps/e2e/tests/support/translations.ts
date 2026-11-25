import { type APIRequestContext, expect } from '@playwright/test';

import type { AppApi } from './app-api';
import type { TestSpace } from './fixtures';

/** The locales every translation test works with: English (the default), German and Romanian. */
export const LOCALES = { en: 'English', de: 'German', ro: 'Romanian' } as const;

export interface TranslationDto {
  id: string;
  key: string;
  locales: Record<string, string>;
  labels?: string[];
  description?: string;
}

/** Adds German and Romanian to a space (English is its default locale). */
export async function withThreeLocales(api: AppApi, space: TestSpace): Promise<void> {
  await api.addLocale(space.id, 'de');
  await api.addLocale(space.id, 'ro');
}

/** The space's translations, by key. */
export async function translationsByKey(api: AppApi, spaceId: string): Promise<Map<string, TranslationDto>> {
  const all = await api.everyPageOf<TranslationDto>(`/api/app/spaces/${spaceId}/translations`);
  return new Map(all.map(it => [it.key, it]));
}

/** One translation by its exact key (the list's `?key=` filter), without reading the others. */
export async function translationByKey(api: AppApi, spaceId: string, key: string): Promise<TranslationDto | undefined> {
  const page = await api.get<{ items: TranslationDto[] }>(`/api/app/spaces/${spaceId}/translations?key=${encodeURIComponent(key)}`);
  return page.items.find(it => it.key === key);
}

/** How many translations the space has (the list's total: one request, also for a large space). */
export async function translationCount(api: AppApi, spaceId: string): Promise<number> {
  return (await api.get<{ total: number }>(`/api/app/spaces/${spaceId}/translations?size=1`)).total;
}

/** The public token per space, created on first use (one per space is enough to read the CDN). */
const publicTokens = new Map<string, Promise<string>>();

function publicToken(api: AppApi, spaceId: string): Promise<string> {
  let token = publicTokens.get(spaceId);
  if (!token) {
    token = api.createToken(spaceId, { name: 'CDN read-back', type: 'public' }).then(it => it.token);
    publicTokens.set(spaceId, token);
  }
  return token;
}

/**
 * What the CDN API serves for a locale (published data), with a public token. Anything but 200 fails, also a 404
 * (nothing published yet): a test that expects "not delivered" checks the status with `publishedStatus`.
 */
export async function published(request: APIRequestContext, api: AppApi, spaceId: string, locale: string): Promise<Record<string, string>> {
  const token = await publicToken(api, spaceId);
  const response = await request.get(`/api/v1/spaces/${spaceId}/translations/${locale}?token=${token}`);
  expect(response.status(), `CDN translations ${locale}: ${await response.text()}`).toBe(200);
  return (await response.json()) as Record<string, string>;
}

/** The status the CDN API answers for a locale's translations (404: nothing published). */
export async function publishedStatus(request: APIRequestContext, api: AppApi, spaceId: string, locale: string): Promise<number> {
  const token = await publicToken(api, spaceId);
  return (await request.get(`/api/v1/spaces/${spaceId}/translations/${locale}?token=${token}`)).status();
}

/** The machine-translation stub of the e2e server (LOCALESS_TRANSLATE_PROVIDER=stub). */
export function stubTranslation(text: string, source: string, target: string): string {
  return `${text} : ${source} -> ${target}`;
}
