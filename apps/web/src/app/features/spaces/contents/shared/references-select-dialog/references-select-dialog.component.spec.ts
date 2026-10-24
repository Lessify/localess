import { HttpParams } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DIALOG_DATA } from '@angular/cdk/dialog';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { Content, ContentFolder, ContentKind, Schema, SchemaType } from '@localess/shared';
import { ContentService } from '@core/services/content.service';
import { NotificationService } from '@core/services/notification.service';
import { SpaceStore } from '@core/stores/space.store';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { ReferencesSelectDialogContext } from './references-select-dialog.model';
import { ReferencesSelectDialogComponent } from './references-select-dialog.component';

function folder(overrides: Partial<ContentFolder> = {}): ContentFolder {
  return { id: 'f1', kind: ContentKind.FOLDER, name: 'Docs', fullSlug: '', ...overrides } as unknown as ContentFolder;
}

/** Lets the page's resource take the answer (it resolves through a promise), then runs the effects. */
const settle = async () => {
  TestBed.tick();
  await new Promise(resolve => setTimeout(resolve));
  TestBed.tick();
};

describe('ReferencesSelectDialogComponent', () => {
  function setup(context: ReferencesSelectDialogContext, contents: Content[] = [], schemas: Schema[] = []) {
    const close = vi.fn();
    const findAll = vi.fn().mockReturnValue(of({ items: contents, page: 0, size: 20, total: contents.length }));
    const error = vi.fn();

    TestBed.overrideComponent(ReferencesSelectDialogComponent, {
      set: { template: '<table llTableSort></table><ll-paginator [length]="0" />' },
    });
    TestBed.configureTestingModule({
      providers: [
        { provide: DIALOG_DATA, useValue: context },
        { provide: BrnDialogRef, useValue: { close } },
        {
          provide: SpaceStore,
          useValue: {
            schemas: signal(schemas),
            contentFolders: signal([
              { id: 'a', kind: ContentKind.FOLDER, name: 'A', slug: 'a', fullSlug: 'a', updatedAt: '' },
              { id: 'b', kind: ContentKind.FOLDER, name: 'B', slug: 'b', parentId: 'a', fullSlug: 'a/b', updatedAt: '' },
            ]),
          },
        },
        { provide: NotificationService, useValue: { error } },
        {
          provide: ContentService,
          useValue: {
            findAll,
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(ReferencesSelectDialogComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, close, findAll, error };
  }

  /** The query of the last page read. */
  const lastQuery = (findAll: ReturnType<typeof setup>['findAll']) => (findAll.mock.calls.at(-1)?.[1] as HttpParams).toString();

  it("loads the root's first page, the same query as the Contents table", async () => {
    const items = [folder({ id: 'f1' })];
    const schemas = [{ id: 's1', name: 's1', type: SchemaType.ROOT } as Schema];
    const { component, findAll } = setup({ spaceId: 'space-1' }, items, schemas);
    await settle();

    expect(findAll.mock.calls.at(-1)?.[0]).toBe('space-1');
    expect(lastQuery(findAll)).toBe('page=0&size=20');
    expect(component.dataSource.filteredData()).toEqual(items);
    expect(component.page.total()).toBe(1);
    expect(component.schemasMapByName().get('s1')).toEqual(schemas[0]);
    expect(component.page.loading()).toBe(false);
  });

  it('onRowSelect() toggles selection for documents', () => {
    const { component } = setup({ spaceId: 'space-1' });
    const doc = { id: 'c1', kind: ContentKind.DOCUMENT, name: 'Page' } as unknown as Content;

    component.onRowSelect(doc);

    expect(component.selection.isSelected(doc as never)).toBe(true);
  });

  it('onRowSelect() navigates into folders, keeping the search and the scope', () => {
    const { component, findAll } = setup({ spaceId: 'space-1' });
    component.contentList.onFilterChange({ search: 'home', scope: 'deep' });

    component.onRowSelect(folder({ id: 'f1', name: 'Docs', fullSlug: 'docs' }));
    TestBed.tick();

    expect(lastQuery(findAll)).toBe('page=0&size=20&search=home&deep=true&parentId=f1');
  });

  it('keeps the selection across pages and folders', () => {
    const { component } = setup({ spaceId: 'space-1', multiple: true });
    const one = { id: 'c1', kind: ContentKind.DOCUMENT, name: 'One' } as unknown as Content;
    component.onRowSelect(one);
    component.contentList.list.page.set(1);
    component.onRowSelect(folder({ id: 'f1' }));
    component.onRowSelect({ id: 'c2', kind: ContentKind.DOCUMENT, name: 'Two' } as unknown as Content);

    expect(component.selection.selected.map(it => it.id)).toEqual(['c1', 'c2']);
  });

  it('tells a failed load', async () => {
    const { component, findAll, error } = setup({ spaceId: 'space-1' });
    findAll.mockReturnValueOnce(throwError(() => new Error('boom')));
    component.contentList.onFilterChange({ search: 'x', scope: '' });
    await settle();
    expect(error).toHaveBeenCalledWith('Contents can not be loaded.');
  });

  it('builds the breadcrumbs from the folder map, and goes back by folder id', () => {
    const { component } = setup({ spaceId: 'space-1' });
    component.onRowSelect(folder({ id: 'a', name: 'A', fullSlug: 'a' }));
    component.onRowSelect(folder({ id: 'b', name: 'B', fullSlug: 'a/b' }));
    expect(component.trail().map(it => it.name)).toEqual(['A', 'B']);

    component.navigateToFolder('a');
    expect(component.trail().map(it => it.name)).toEqual(['A']);
    component.navigateToFolder(null);
    expect(component.trail()).toEqual([]);
  });
});
