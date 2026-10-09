import { Injector, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { TableDataSource } from './table-data-source';

interface Row {
  id: number;
  name: string;
}

describe('TableDataSource', () => {
  function createDataSource(rows: Row[]) {
    const injector = TestBed.inject(Injector);
    return new TableDataSource<Row>(signal(rows), injector);
  }

  it('renders all rows when no sort/paginator/filter is attached', () => {
    const ds = createDataSource([
      { id: 1, name: 'b' },
      { id: 2, name: 'a' },
    ]);
    expect(ds.renderedData()).toEqual([
      { id: 1, name: 'b' },
      { id: 2, name: 'a' },
    ]);
  });

  it('sorts using the default accessor', () => {
    const ds = createDataSource([
      { id: 1, name: 'b' },
      { id: 2, name: 'a' },
    ]);
    ds.sort = { active: signal('name'), direction: signal('asc') };
    expect(ds.renderedData().map(r => r.name)).toEqual(['a', 'b']);
  });

  it('reverses order for descending direction', () => {
    const ds = createDataSource([
      { id: 1, name: 'b' },
      { id: 2, name: 'a' },
    ]);
    ds.sort = { active: signal('name'), direction: signal('desc') };
    expect(ds.renderedData().map(r => r.name)).toEqual(['b', 'a']);
  });

  it('sorts using a custom sortingDataAccessor', () => {
    const ds = createDataSource([
      { id: 1, name: 'b' },
      { id: 2, name: 'a' },
    ]);
    ds.sortingDataAccessor = (row, columnId) => (columnId === 'name' ? row.name.toUpperCase() : row.id);
    ds.sort = { active: signal('name'), direction: signal('asc') };
    expect(ds.renderedData().map(r => r.name)).toEqual(['a', 'b']);
  });

  it('filters rows using the default predicate (case-insensitive substring of JSON)', () => {
    const ds = createDataSource([
      { id: 1, name: 'apple' },
      { id: 2, name: 'banana' },
    ]);
    ds.filter = 'ban';
    expect(ds.renderedData()).toEqual([{ id: 2, name: 'banana' }]);
  });

  it('filters rows using a custom filterPredicate', () => {
    const ds = createDataSource([
      { id: 1, name: 'apple' },
      { id: 2, name: 'banana' },
    ]);
    ds.filterPredicate = (row, filter) => row.id.toString() === filter;
    ds.filter = '2';
    expect(ds.renderedData()).toEqual([{ id: 2, name: 'banana' }]);
  });

  it('paginates rows according to pageIndex/pageSize', () => {
    const rows = Array.from({ length: 5 }, (_, i) => ({ id: i, name: `row-${i}` }));
    const ds = createDataSource(rows);
    ds.paginator = { pageIndex: signal(1), pageSize: signal(2) };
    expect(ds.renderedData().map(r => r.id)).toEqual([2, 3]);
  });

  it('applies filter, sort, and pagination together', () => {
    const rows = [
      { id: 1, name: 'apple' },
      { id: 2, name: 'apricot' },
      { id: 3, name: 'banana' },
      { id: 4, name: 'avocado' },
    ];
    const ds = createDataSource(rows);
    ds.filter = 'ap';
    ds.sort = { active: signal('name'), direction: signal('asc') };
    ds.paginator = { pageIndex: signal(0), pageSize: signal(1) };
    expect(ds.renderedData().map(r => r.name)).toEqual(['apple']);
  });

  it('recomputes when the source data signal changes', () => {
    const injector = TestBed.inject(Injector);
    const rows = signal<Row[]>([{ id: 1, name: 'a' }]);
    const ds = new TableDataSource<Row>(rows, injector);
    expect(ds.renderedData()).toEqual([{ id: 1, name: 'a' }]);
    rows.set([
      { id: 1, name: 'a' },
      { id: 2, name: 'b' },
    ]);
    expect(ds.renderedData()).toEqual([
      { id: 1, name: 'a' },
      { id: 2, name: 'b' },
    ]);
  });

  it('emits the rendered data through connect()', async () => {
    const ds = createDataSource([{ id: 1, name: 'a' }]);
    const value = await firstValueFrom(ds.connect());
    expect(value).toEqual([{ id: 1, name: 'a' }]);
    ds.disconnect();
  });

  it('sorts numeric-looking string values numerically, not lexicographically', () => {
    interface CodeRow {
      code: string;
    }
    const injector = TestBed.inject(Injector);
    const ds = new TableDataSource<CodeRow>(signal<CodeRow[]>([{ code: '10' }, { code: '2' }, { code: '1' }]), injector);
    ds.sort = { active: signal('code'), direction: signal('asc') };
    expect(ds.renderedData().map(r => r.code)).toEqual(['1', '2', '10']);
  });
});
