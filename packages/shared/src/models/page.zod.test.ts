import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { zPageable } from './page.zod.js';

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
    for (const query of [{ size: '0' }, { size: '101' }, { page: '-1' }, { page: '1.5' }, { page: 'x' }, { sort: 'password' }, { direction: 'up' }]) {
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
});
