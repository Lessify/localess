import { describe, expect, it } from 'vitest';

import { PagedList } from './paged-list';

describe('PagedList', () => {
  const query = (list: PagedList) => list.params().toString();

  it('asks for the first page of the given size, the server’s default order', () => {
    expect(query(new PagedList(25))).toBe('page=0&size=25');
  });

  it('sends a sort and its direction; no direction is the server’s default order', () => {
    const list = new PagedList(25);
    list.setSort('role', 'desc');
    expect(query(list)).toBe('page=0&size=25&sort=role&direction=desc');
    list.setSort('role', '');
    expect(query(list)).toBe('page=0&size=25');
  });

  it('sends the filters that have a value, and leaves out empty ones', () => {
    const list = new PagedList(25);
    list.setFilters({ search: 'ali', active: '', other: undefined });
    expect(query(list)).toBe('page=0&size=25&search=ali');
  });

  it('goes back to the first page when the sort or a filter changes', () => {
    const list = new PagedList(25);
    list.page.set(3);
    list.setSort('email', 'asc');
    expect(list.page()).toBe(0);
    list.page.set(3);
    list.setFilters({ search: 'x' });
    expect(list.page()).toBe(0);
  });

  it('moves to the last page when the page asked for is past the end (rows deleted meanwhile)', () => {
    const list = new PagedList(20);
    list.page.set(5);
    list.onLoaded({ items: [], page: 5, size: 20, total: 45 });
    expect(list.page()).toBe(2);
  });

  it('stays put on an empty list, and on a page with items', () => {
    const list = new PagedList(20);
    list.onLoaded({ items: [], page: 0, size: 20, total: 0 });
    expect(list.page()).toBe(0);
    list.page.set(1);
    list.onLoaded({ items: [1], page: 1, size: 20, total: 21 });
    expect(list.page()).toBe(1);
  });
});
