import { describe, expect, it } from 'vitest';

import { maskWebhookUrl, unmaskWebhookUrl } from './webhook-url.js';

const CLOUD_BUILD = 'https://cloudbuild.googleapis.com/v1/projects/p/triggers/deploy:webhook?key=AIzaK3y&secret=s3cr3t&trigger=deploy';

describe('webhook URL masking', () => {
  it('masks every query value, keeping the names; a URL without a query stays as it is', () => {
    expect(maskWebhookUrl(CLOUD_BUILD)).toBe(
      'https://cloudbuild.googleapis.com/v1/projects/p/triggers/deploy:webhook?key=••••&secret=••••&trigger=••••',
    );
    expect(maskWebhookUrl('https://example.com/hook')).toBe('https://example.com/hook');
    expect(maskWebhookUrl('https://example.com/hook?')).toBe('https://example.com/hook?');
    expect(maskWebhookUrl('https://example.com/hook?flag#frag')).toBe('https://example.com/hook?flag=••••');
  });

  it('keeps the stored values of masked parameters, takes new ones as sent', () => {
    expect(unmaskWebhookUrl(maskWebhookUrl(CLOUD_BUILD), CLOUD_BUILD)).toBe(CLOUD_BUILD);
    const changed = 'https://cloudbuild.googleapis.com/v1/projects/p/triggers/other:webhook?key=••••&secret=n3w&trigger=other';
    expect(unmaskWebhookUrl(changed, CLOUD_BUILD)).toBe(
      'https://cloudbuild.googleapis.com/v1/projects/p/triggers/other:webhook?key=AIzaK3y&secret=n3w&trigger=other',
    );
    expect(unmaskWebhookUrl('https://example.com/a?b=c', CLOUD_BUILD)).toBe('https://example.com/a?b=c');
    // The n-th masked value of a name is the n-th stored one.
    expect(unmaskWebhookUrl('https://e.com/?a=••••&a=••••', 'https://e.com/?a=1&a=2')).toBe('https://e.com/?a=1&a=2');
  });

  it('refuses a masked parameter with nothing stored', () => {
    expect(unmaskWebhookUrl('https://example.com/hook?token=••••', CLOUD_BUILD)).toBeUndefined();
    expect(unmaskWebhookUrl('https://e.com/?a=••••&a=••••', 'https://e.com/?a=1')).toBeUndefined();
  });
});
