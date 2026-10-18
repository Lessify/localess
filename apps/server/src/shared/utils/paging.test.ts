import { describe, expect, it } from 'vitest';
import { containsPattern, escapeLike, offsetOf, toPage } from './paging.js';

const pageable = (page: number, size: number) => ({ page, size, sort: 'name', direction: 'asc' as const });

describe('paging', () => {
  it('skips the rows of the pages before', () => {
    expect(offsetOf(pageable(0, 20))).toBe(0);
    expect(offsetOf(pageable(2, 20))).toBe(40);
  });

  it('wraps rows and the count into a page, mapping each row', () => {
    expect(toPage([{ n: 1 }, { n: 2 }], 45, pageable(1, 20), it => it.n * 10)).toEqual({ items: [10, 20], page: 1, size: 20, total: 45 });
  });

  it('answers past the last page with no items and the real total', () => {
    expect(toPage([], 45, pageable(5, 20), it => it)).toEqual({ items: [], page: 5, size: 20, total: 45 });
  });

  it('matches search text literally: LIKE wildcards and the escape character are escaped', () => {
    expect(escapeLike('50%_a\\b')).toBe('50\\%\\_a\\\\b');
    expect(containsPattern('50%')).toBe('%50\\%%');
  });
});
