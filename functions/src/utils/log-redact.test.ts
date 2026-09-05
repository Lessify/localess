import { describe, expect, it } from 'vitest';
import { redactQuery } from './log-redact';

describe('redactQuery', () => {
  it('replaces a token value with a placeholder', () => {
    expect(redactQuery({ token: 'super-secret', cv: '17' })).toBe('{"token":"[REDACTED]","cv":"17"}');
  });

  it('redacts regardless of key casing', () => {
    expect(redactQuery({ Token: 'super-secret' })).toBe('{"Token":"[REDACTED]"}');
    expect(redactQuery({ TOKEN: 'super-secret' })).toBe('{"TOKEN":"[REDACTED]"}');
  });

  it('redacts every known secret key', () => {
    expect(redactQuery({ token: 'a', apiKey: 'b', api_key: 'c', secret: 'd' })).toBe(
      '{"token":"[REDACTED]","apiKey":"[REDACTED]","api_key":"[REDACTED]","secret":"[REDACTED]"}'
    );
  });

  it('leaves non-secret values untouched', () => {
    expect(redactQuery({ locale: 'en', version: 'draft', resolveLink: 'true' })).toBe(
      '{"locale":"en","version":"draft","resolveLink":"true"}'
    );
  });

  it('redacts repeated query params given as arrays', () => {
    expect(redactQuery({ token: ['a', 'b'] })).toBe('{"token":"[REDACTED]"}');
  });

  it('handles an empty or absent query object', () => {
    expect(redactQuery({})).toBe('{}');
    expect(redactQuery(undefined)).toBe('{}');
  });
});
