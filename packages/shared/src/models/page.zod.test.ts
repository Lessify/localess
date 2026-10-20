import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { zMultiValue, zPageable, zSearch } from './page.zod.js';

describe('zPageable', () => {
  const schema = zPageable(['email', 'name'], 'email');

  it('defaults to the first page of 20, sorted by the default field ascending', () => {
    expect(schema.parse({})).toEqual({ page: 0, size: 20, sort: 'email', direction: 'asc' });
  });

  it('reads query strings as numbers', () => {
    expect(schema.parse({ page: '2', size: '50', sort: 'name', direction: 'desc' })).toEqual({
      page: 2,
      size: 50,
      sort: 'name',
      direction: 'desc',
    });
  });

  it('refuses a size outside 1…100, a negative or fractional page, an unknown field or direction', () => {
    for (const query of [
      { size: '0' },
      { size: '101' },
      { page: '-1' },
      { page: '1.5' },
      { page: 'x' },
      { sort: 'password' },
      { direction: 'up' },
    ]) {
      expect(schema.safeParse(query).success, JSON.stringify(query)).toBe(false);
    }
  });

  it('takes an endpoint’s filters next to the paging', () => {
    expect(schema.extend({ search: z.string().optional() }).parse({ search: 'ali', page: '1' })).toEqual({
      page: 1,
      size: 20,
      sort: 'email',
      direction: 'asc',
      search: 'ali',
    });
  });

  it('takes the endpoint’s default direction', () => {
    const newestFirst = zPageable(['createdAt'], 'createdAt', 'desc');
    expect(newestFirst.parse({})).toMatchObject({ sort: 'createdAt', direction: 'desc' });
    expect(newestFirst.parse({ direction: 'asc' })).toMatchObject({ direction: 'asc' });
  });
});

describe('zMultiValue', () => {
  const schema = zMultiValue(['FAILED', 'FINISHED', 'INITIATED']);

  it('reads one value (a string) or a repeated parameter (an array) as an array', () => {
    expect(schema.parse('FAILED')).toEqual(['FAILED']);
    expect(schema.parse(['FAILED', 'FINISHED'])).toEqual(['FAILED', 'FINISHED']);
  });

  it('refuses an unknown value, alone or among others', () => {
    for (const value of ['DONE', ['FAILED', 'DONE'], [], '']) expect(schema.safeParse(value).success, JSON.stringify(value)).toBe(false);
  });
});

describe('zSearch', () => {
  const schema = z.object({ search: zSearch });

  it('trims the search', () => {
    expect(schema.parse({ search: '  Acme ' })).toEqual({ search: 'Acme' });
  });

  it('reads empty or only spaces as no search', () => {
    for (const search of [undefined, '', '   ']) expect(schema.parse({ search }).search).toBeUndefined();
  });

  it('refuses more than 200 characters', () => {
    expect(schema.safeParse({ search: 'x'.repeat(200) }).success).toBe(true);
    expect(schema.safeParse({ search: 'x'.repeat(201) }).success).toBe(false);
  });
});
