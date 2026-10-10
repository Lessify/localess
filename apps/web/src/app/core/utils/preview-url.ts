import { CONTENT_DEFAULT_LOCALE } from '@localess/shared';

/** Values a preview environment URL can be filled with, see {@link resolvePreviewUrl}. */
export interface PreviewUrlContext {
  documentId: string;
  /** e.g. `blog/hello` */
  fullSlug: string;
  /** e.g. `hello` */
  slug: string;
  /** e.g. `blog`; empty at the root */
  parentSlug: string;
  /** The selected locale id; `default` for the default locale. */
  localeId: string;
  /** The space's default locale id, used for `{locale}` on the default locale. */
  defaultLocaleId: string;
}

export const PREVIEW_URL_PLACEHOLDERS = ['fullSlug', 'slug', 'parentSlug', 'locale', 'locale/', 'documentId'] as const;

const PLACEHOLDER = /\{([^{}]*)\}/g;

/** Placeholders in `url` that {@link resolvePreviewUrl} doesn't know, e.g. `{lang}`. */
export function unknownPreviewUrlPlaceholders(url: string): string[] {
  return [...url.matchAll(PLACEHOLDER)]
    .map(match => match[1])
    .filter(name => !(PREVIEW_URL_PLACEHOLDERS as readonly string[]).includes(name))
    .map(name => `{${name}}`);
}

/**
 * Builds the preview URL of a document from an environment URL.
 *
 * A URL without placeholders keeps the original convention: `url + locale/ + fullSlug`, leaving
 * the locale out for the default locale. Otherwise each placeholder is replaced, URL-encoded per
 * path segment: `{fullSlug}`, `{slug}`, `{parentSlug}`, `{documentId}`, `{locale}` (the space's
 * space's default locale on the `default` sentinel) and `{locale/}` (`de/`, or nothing for the default
 * locale). Unknown placeholders are left as they are; the settings form rejects them.
 *
 * The result is not checked here: pass it through `isSafePreviewUrl` before loading it.
 */
export function resolvePreviewUrl(url: string, context: PreviewUrlContext): string {
  const isDefaultLocale = context.localeId === CONTENT_DEFAULT_LOCALE.id;
  if (!url.includes('{')) {
    const localePart = isDefaultLocale ? '' : `${context.localeId}/`;
    return `${url}${localePart}${context.fullSlug}`;
  }
  const values: Record<(typeof PREVIEW_URL_PLACEHOLDERS)[number], string> = {
    fullSlug: encodePath(context.fullSlug),
    slug: encodePath(context.slug),
    parentSlug: encodePath(context.parentSlug),
    documentId: encodeURIComponent(context.documentId),
    locale: encodeURIComponent(isDefaultLocale ? context.defaultLocaleId : context.localeId),
    'locale/': isDefaultLocale ? '' : `${encodeURIComponent(context.localeId)}/`,
  };
  return url.replace(PLACEHOLDER, (match, name: string) => (name in values ? values[name as keyof typeof values] : match));
}

function encodePath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/');
}
