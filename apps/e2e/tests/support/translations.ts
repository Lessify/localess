import type { APIRequestContext } from '@playwright/test';

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
  const all = await api.get<TranslationDto[]>(`/api/app/spaces/${spaceId}/translations`);
  return new Map(all.map(it => [it.key, it]));
}

/** What the CDN API serves for a locale (published data), with a public token. */
export async function published(request: APIRequestContext, api: AppApi, spaceId: string, locale: string): Promise<Record<string, string>> {
  const { token } = await api.createToken(spaceId, { name: `CDN ${locale}`, type: 'public' });
  const response = await request.get(`/api/v1/spaces/${spaceId}/translations/${locale}?token=${token}`);
  return response.status() === 404 ? {} : ((await response.json()) as Record<string, string>);
}

/** The machine-translation stub of the e2e server (LOCALESS_TRANSLATE_PROVIDER=stub). */
export function stubTranslation(text: string, source: string, target: string): string {
  return `${text} : ${source} -> ${target}`;
}
