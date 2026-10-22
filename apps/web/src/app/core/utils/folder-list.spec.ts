import { FOLDER_SCOPE_DEEP, FolderList } from './folder-list';

describe('FolderList', () => {
  it('starts at the root with the fixed filters, 20 a page', () => {
    const list = new FolderList(20, { fileType: 'IMAGE' });

    expect(list.list.params().toString()).toBe('page=0&size=20&fileType=IMAGE');
    expect(list.deep()).toBe(false);
    expect(list.filtering()).toBe(false);
  });

  it('a folder, a search or the scope starts from the first page; the fixed filters and the folder stay', () => {
    const list = new FolderList(20, { fileType: 'IMAGE' });
    list.setFolder('f1');
    list.list.page.set(3);

    list.onFilterChange({ search: ' logo ', scope: FOLDER_SCOPE_DEEP });
    expect(list.list.params().toString()).toBe('page=0&size=20&fileType=IMAGE&parentId=f1&search=logo&deep=true');
    expect(list.deep()).toBe(true);
    expect(list.filtering()).toBe(true);

    list.list.page.set(2);
    list.setFolder(null);
    expect(list.list.params().toString()).toBe('page=0&size=20&fileType=IMAGE&search=logo&deep=true');

    list.onFilterChange({ search: '', scope: 'folder' });
    expect(list.list.params().toString()).toBe('page=0&size=20&fileType=IMAGE');
    expect(list.filtering()).toBe(false);
  });

  it('sorts on the server, from the first page', () => {
    const list = new FolderList();
    list.list.page.set(1);

    list.onSortChange({ active: 'size', direction: 'desc' });

    expect(list.list.params().toString()).toBe('page=0&size=20&sort=size&direction=desc');
  });
});
