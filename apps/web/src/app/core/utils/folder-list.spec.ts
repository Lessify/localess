import { signal } from '@angular/core';

import { FOLDER_SCOPE_DEEP, FolderList } from './folder-list';

describe('FolderList', () => {
  it('starts at the root with the fixed filters, 20 a page', () => {
    const list = new FolderList(signal(null), 20, { fileType: 'IMAGE' });

    expect(list.list.params().toString()).toBe('page=0&size=20&fileType=IMAGE');
    expect(list.deep()).toBe(false);
    expect(list.filtering()).toBe(false);
  });

  it('reads the folder from its signal: a change is in the query at once, from the first page', () => {
    const folder = signal<string | null>('f1');
    const list = new FolderList(folder);
    expect(list.list.params().toString()).toBe('page=0&size=20&parentId=f1');

    list.list.page.set(3);
    folder.set('f2');
    expect(list.list.params().toString()).toBe('page=0&size=20&parentId=f2');

    folder.set(null);
    expect(list.list.params().toString()).toBe('page=0&size=20');
  });

  it('a search or the scope starts from the first page; the fixed filters and the folder stay', () => {
    const folder = signal<string | null>('f1');
    const list = new FolderList(folder, 20, { fileType: 'IMAGE' });
    list.list.page.set(3);

    list.onFilterChange({ search: ' logo ', scope: FOLDER_SCOPE_DEEP });
    expect(list.list.params().toString()).toBe('page=0&size=20&fileType=IMAGE&search=logo&deep=true&parentId=f1');
    expect(list.deep()).toBe(true);
    expect(list.filtering()).toBe(true);

    list.list.page.set(2);
    folder.set(null);
    expect(list.list.params().toString()).toBe('page=0&size=20&fileType=IMAGE&search=logo&deep=true');

    list.onFilterChange({ search: '', scope: 'folder' });
    expect(list.list.params().toString()).toBe('page=0&size=20&fileType=IMAGE');
    expect(list.filtering()).toBe(false);
  });

  it('sorts on the server, from the first page', () => {
    const list = new FolderList(signal(null));
    list.list.page.set(1);

    list.onSortChange({ active: 'size', direction: 'desc' });

    expect(list.list.params().toString()).toBe('page=0&size=20&sort=size&direction=desc');
  });

  it('keeps the page the paginator sets while nothing else changes', () => {
    const folder = signal<string | null>('f1');
    const list = new FolderList(folder);
    list.list.page.set(2);
    folder.set('f1');

    expect(list.list.page()).toBe(2);
  });
});
