/**
 * What a URL query value is answered as: build and deploy hooks (GCP Cloud Build `?key=…&secret=…`), revalidation routes
 * (`?secret=…`) and automation tools put their credentials in the query, so it is never answered nor logged. The value
 * comes back unchanged in a form that didn't touch it, which keeps the stored one.
 */
export const WEBHOOK_URL_MASK = '••••';

/** The URL with every query value masked, names kept (`?key=••••&secret=••••`); one without a query as it is. */
export function maskWebhookUrl(url: string): string {
  const query = url.indexOf('?');
  if (query === -1) return url;
  const hash = url.indexOf('#', query);
  const params = url.slice(query + 1, hash === -1 ? undefined : hash);
  if (!params) return url;
  const masked = params
    .split('&')
    .map(pair => `${pair.split('=')[0]}=${WEBHOOK_URL_MASK}`)
    .join('&');
  return `${url.slice(0, query)}?${masked}`;
}

/**
 * The URL to store from one sent back: a masked value keeps the stored value of that parameter (the n-th of its name for
 * the n-th masked one). `undefined` when a masked parameter has no stored value. A URL without a mask is kept as sent.
 */
export function unmaskWebhookUrl(sent: string, stored: string): string | undefined {
  if (!sent.includes(WEBHOOK_URL_MASK)) return sent;
  let url: URL;
  let previous: URL;
  try {
    url = new URL(sent);
    previous = new URL(stored);
  } catch {
    return undefined;
  }
  const kept = [...previous.searchParams.entries()];
  const seen = new Map<string, number>();
  const entries: [string, string][] = [];
  for (const [name, value] of url.searchParams.entries()) {
    const nth = seen.get(name) ?? 0;
    seen.set(name, nth + 1);
    if (value !== WEBHOOK_URL_MASK) {
      entries.push([name, value]);
      continue;
    }
    const match = kept.filter(([it]) => it === name)[nth];
    if (!match) return undefined;
    entries.push([name, match[1]]);
  }
  url.search = new URLSearchParams(entries).toString();
  return url.toString();
}
