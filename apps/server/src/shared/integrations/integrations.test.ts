import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { fakeServer } from '../../../test/fake-server.js';
import { loadConfig } from '../../infra/config/config.js';
import { googleCredentials, integrationProviders } from './integration-providers.js';

const translateText = vi.fn();
vi.mock('@google-cloud/translate', () => ({
  TranslationServiceClient: class {
    translateText = translateText;
  },
}));

const SERVICE_ACCOUNT = JSON.stringify({
  type: 'service_account',
  project_id: 'acme-cms',
  client_email: 'l@acme-cms.iam',
  private_key: 'KEY',
});

describe('DeepL', () => {
  let deepl: Awaited<ReturnType<typeof fakeServer>>;
  let status = 200;

  beforeAll(async () => {
    deepl = await fakeServer(() => ({
      status,
      body: status === 200 ? { character_count: 112400, character_limit: 500000 } : { message: 'nope' },
    }));
  });
  afterAll(() => deepl.close());

  const provider = () => integrationProviders(loadConfig({ LOCALESS_DEEPL_API_URL: deepl.url })).deepl;

  it('reports the plan and the characters used on success', async () => {
    status = 200;
    const result = await provider().test({ apiKey: 'abc:fx' });
    expect(result).toMatchObject({ ok: true });
    expect(result.details).toContain('112,400 of 500,000');
    expect(result.details).toContain('Free');
  });

  it('tells a rejected key from a used-up quota', async () => {
    status = 403;
    expect(await provider().test({ apiKey: 'abc' })).toMatchObject({ ok: false, reason: 'auth' });
    status = 456;
    expect(await provider().test({ apiKey: 'abc' })).toMatchObject({ ok: false, reason: 'quota' });
  });

  it('counts a DeepL outage or overload as unreachable, not as its key or quota', async () => {
    const { DeepLError, TooManyRequestsError } = await import('deepl-node');
    expect(provider().classify(new DeepLError('Service unavailable, message: down'))).toBe('unreachable');
    expect(provider().classify(new DeepLError('Unexpected status code: 500 Internal Server Error, content: x'))).toBe('unreachable');
    expect(provider().classify(new TooManyRequestsError('Too many requests, DeepL servers are currently experiencing high load'))).toBe(
      'unreachable',
    );
    expect(provider().classify(new DeepLError('Bad request, message: x'))).toBe('other');
  });

  it('says when DeepL cannot be reached', async () => {
    const closed = integrationProviders(loadConfig({ LOCALESS_DEEPL_API_URL: 'http://127.0.0.1:1' })).deepl;
    expect(await closed.test({ apiKey: 'abc' })).toMatchObject({ ok: false, reason: 'unreachable' });
  });

  it('asks for the key when it is missing', () => {
    expect(provider().validate({})).toBe('Enter the API key.');
    expect(provider().validate({ apiKey: 'k' })).toBeUndefined();
  });
});

describe('Unsplash', () => {
  let unsplash: Awaited<ReturnType<typeof fakeServer>>;

  beforeAll(async () => {
    unsplash = await fakeServer(request => {
      const key = request.headers.authorization;
      if (key === 'Client-ID good') return { status: 200, body: [{ id: 'p' }], headers: { 'X-RateLimit-Limit': '50' } };
      if (key === 'Client-ID busy') return { status: 403, body: 'Rate Limit Exceeded' };
      return { status: 401, body: { errors: ['OAuth error: The access token is invalid'] } };
    });
  });
  afterAll(() => unsplash.close());

  const provider = () => integrationProviders(loadConfig({ LOCALESS_UNSPLASH_API_URL: unsplash.url })).unsplash;

  it('reports a Demo app with the link to apply for Production', async () => {
    const result = await provider().test({ apiKey: 'good' });
    expect(result).toMatchObject({ ok: true, fixUrl: 'https://unsplash.com/oauth/applications' });
    expect(result.details).toContain('Demo');
    expect(unsplash.requests.at(-1)?.url).toBe('/photos?per_page=1');
  });

  it('explains a rejected key, and a rate limit as quota', async () => {
    const rejected = await provider().test({ apiKey: 'bad' });
    expect(rejected).toMatchObject({ ok: false, reason: 'auth' });
    expect(rejected.message).toContain('Access Key, not the Secret Key');
    expect(await provider().test({ apiKey: 'busy' })).toMatchObject({ ok: false, reason: 'quota' });
  });
});

describe('Google Cloud Translation', () => {
  const provider = () => integrationProviders(loadConfig({}))['google-translate'];

  it('checks the service account JSON before any call', () => {
    expect(provider().validate({ serviceAccount: 'not json' })).toBe('Paste the whole service account JSON file.');
    expect(provider().validate({ serviceAccount: JSON.stringify({ installed: { client_id: 'x' } }) })).toBe(
      "This doesn't look like a service account key.",
    );
    expect(provider().validate({ serviceAccount: SERVICE_ACCOUNT })).toBeUndefined();
    expect(translateText).not.toHaveBeenCalled();
  });

  it('reads the project and credentials from the JSON', () => {
    expect(googleCredentials({ serviceAccount: SERVICE_ACCOUNT })).toEqual({
      projectId: 'acme-cms',
      credentials: { client_email: 'l@acme-cms.iam', private_key: 'KEY' },
    });
  });

  it('translates one word to test, and links to enabling the API when it is off', async () => {
    translateText.mockResolvedValueOnce([{ translations: [{ translatedText: 'hallo' }] }]);
    expect(await provider().test({ serviceAccount: SERVICE_ACCOUNT, location: 'global' })).toMatchObject({ ok: true });
    expect(translateText.mock.calls.at(-1)?.[0]).toMatchObject({ parent: 'projects/acme-cms/locations/global', targetLanguageCode: 'de' });

    translateText.mockRejectedValueOnce(
      Object.assign(new Error('Cloud Translation API has not been used in project 123 before or it is disabled'), { code: 7 }),
    );
    const off = await provider().test({ serviceAccount: SERVICE_ACCOUNT });
    expect(off).toMatchObject({
      ok: false,
      reason: 'setup',
      fixUrl: 'https://console.cloud.google.com/apis/library/translate.googleapis.com?project=acme-cms',
    });
  });

  it('classifies auth and quota errors', async () => {
    translateText.mockRejectedValueOnce(Object.assign(new Error('unauthenticated'), { code: 16 }));
    expect(await provider().test({ serviceAccount: SERVICE_ACCOUNT })).toMatchObject({ ok: false, reason: 'auth' });
    translateText.mockRejectedValueOnce(Object.assign(new Error('quota'), { code: 8 }));
    expect(await provider().test({ serviceAccount: SERVICE_ACCOUNT })).toMatchObject({ ok: false, reason: 'quota' });
    expect(provider().classify(Object.assign(new Error('x'), { code: 14 }))).toBe('unreachable');
    expect(provider().classify(Object.assign(new Error('internal'), { code: 13 }))).toBe('unreachable');
  });
});
