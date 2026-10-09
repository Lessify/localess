import { describe, expect, it } from 'vitest';
import { FilterPredicateUtils } from './filter-predicate-utils.service';

interface Row {
  id: string;
  name: string;
  labels?: string[];
  status?: string;
}

describe('FilterPredicateUtils', () => {
  const rows: Row[] = [
    { id: '1', name: 'apple', labels: ['fruit', 'red'], status: 'active' },
    { id: '2', name: 'banana', labels: ['fruit', 'yellow'], status: 'inactive' },
    { id: '3', name: 'carrot', labels: ['vegetable'], status: 'active' },
  ];

  it('matches everything when filter has empty search and no filter fields selected', () => {
    const predicate = FilterPredicateUtils.create<Row>({ searchFields: r => [r.name] });
    const filter = JSON.stringify({ search: '' });
    expect(rows.filter(r => predicate(r, filter))).toEqual(rows);
  });

  it('matches rows via case-insensitive substring search across searchFields', () => {
    const predicate = FilterPredicateUtils.create<Row>({ searchFields: r => [r.id, r.name] });
    const filter = JSON.stringify({ search: 'AN' });
    expect(rows.filter(r => predicate(r, filter)).map(r => r.id)).toEqual(['2']);
  });

  it('matches rows via array-overlap on a multiple-mode filter field', () => {
    const predicate = FilterPredicateUtils.create<Row>({
      searchFields: r => [r.name],
      filterFields: [{ key: 'labels', accessor: r => r.labels }],
    });
    const filter = JSON.stringify({ search: '', labels: ['vegetable'] });
    expect(rows.filter(r => predicate(r, filter)).map(r => r.id)).toEqual(['3']);
  });

  it('matches rows via equality on a single-mode filter field', () => {
    const predicate = FilterPredicateUtils.create<Row>({
      searchFields: r => [r.name],
      filterFields: [{ key: 'status', accessor: r => r.status }],
    });
    const filter = JSON.stringify({ search: '', status: 'active' });
    expect(rows.filter(r => predicate(r, filter)).map(r => r.id)).toEqual(['1', '3']);
  });

  it('requires both search and filter fields to match when both are set', () => {
    const predicate = FilterPredicateUtils.create<Row>({
      searchFields: r => [r.name],
      filterFields: [{ key: 'labels', accessor: r => r.labels }],
    });
    const filter = JSON.stringify({ search: 'ban', labels: ['fruit'] });
    expect(rows.filter(r => predicate(r, filter)).map(r => r.id)).toEqual(['2']);
    const filterNoMatch = JSON.stringify({ search: 'car', labels: ['fruit'] });
    expect(rows.filter(r => predicate(r, filterNoMatch))).toEqual([]);
  });

  it('ignores undefined/missing accessor values on filter fields', () => {
    const predicate = FilterPredicateUtils.create<Row>({
      searchFields: r => [r.name],
      filterFields: [{ key: 'status', accessor: r => r.status }],
    });
    const filter = JSON.stringify({ search: '', status: 'active' });
    const noStatusRow: Row = { id: '4', name: 'daikon' };
    expect(predicate(noStatusRow, filter)).toBe(false);
  });

  it('treats an empty string on a single-mode filter field as unset (matches everything)', () => {
    const predicate = FilterPredicateUtils.create<Row>({
      searchFields: r => [r.name],
      filterFields: [{ key: 'status', accessor: r => r.status }],
    });
    const filter = JSON.stringify({ search: '', status: '' });
    expect(rows.filter(r => predicate(r, filter))).toEqual(rows);
  });
});
