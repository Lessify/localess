import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DIALOG_DATA } from '@angular/cdk/dialog';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { SpaceStore } from '@core/stores/space.store';
import { Asset, AssetFolderSummary } from '@localess/shared';
import { vi } from 'vitest';

import { MoveDialogContext, MoveTarget } from './move-dialog.model';
import { MOVE_ROOT_KEY, MoveDialogComponent } from './move-dialog.component';

// Blog, Blog/2026, Blog/2026/June, News
const FOLDERS: AssetFolderSummary[] = [
  { id: 'blog', name: 'Blog' },
  { id: 'y2026', name: '2026', parentId: 'blog' },
  { id: 'june', name: 'June', parentId: 'y2026' },
  { id: 'news', name: 'News' },
];

describe('MoveDialogComponent', () => {
  function setup(asset: Partial<Asset>) {
    const close = vi.fn();
    const context: MoveDialogContext = { spaceId: 'space-1', asset: { id: 'a1', kind: 'FILE', ...asset } as Asset };
    TestBed.overrideComponent(MoveDialogComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({
      providers: [
        { provide: DIALOG_DATA, useValue: context },
        { provide: BrnDialogRef, useValue: { close } },
        { provide: SpaceStore, useValue: { assetFolders: signal(FOLDERS) } },
      ],
    });
    const fixture = TestBed.createComponent(MoveDialogComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, close };
  }

  /** The tree as `name` lines, indented two spaces a level; `*` marks where the item is. */
  const outline = (component: MoveDialogComponent): string[] => {
    const lines: string[] = [];
    const visit = (nodes: MoveTarget[] | undefined, depth: number) => {
      for (const it of nodes ?? []) {
        lines.push(`${'  '.repeat(depth)}${it.name}${it.current ? ' *' : ''}`);
        visit(it.children, depth + 1);
      }
    };
    visit(component.nodes(), 0);
    return lines;
  };

  it('shows the root with every folder under it, by name; where the item is marked and open', () => {
    const { component } = setup({ parentId: 'june' });
    expect(outline(component)).toEqual(['Root', '  Blog', '    2026', '      June *', '  News']);
    expect([...component.expandedKeys()].sort()).toEqual([MOVE_ROOT_KEY, 'blog', 'june', 'y2026'].sort());
    expect(component.canMove()).toBe(false);
  });

  it('gives each folder its path of names, and marks the root when the item is there', () => {
    const { component } = setup({});
    expect(outline(component)[0]).toBe('Root *');
    expect(component.nodes()[0].children?.[0].children?.[0].path).toBe('Blog/2026');
  });

  it('leaves out a moved folder and everything under it', () => {
    const { component } = setup({ id: 'y2026', kind: 'FOLDER', parentId: 'blog' } as Partial<Asset>);
    expect(outline(component)).toEqual(['Root', '  Blog *', '  News']);
  });

  it('filters by name or path, keeping the parents, with every branch open', () => {
    const { component } = setup({ parentId: 'news' });
    component.search.set('jun');
    expect(outline(component)).toEqual(['Root', '  Blog', '    2026', '      June']);
    expect(component.shownExpandedKeys().has('y2026')).toBe(true);
    component.search.set('blog/2026');
    expect(outline(component)).toEqual(['Root', '  Blog', '    2026', '      June']);
    component.search.set('nothing');
    expect(component.nodes()[0].children).toBeUndefined();
  });

  it('moves only to another place: the folder chosen, or null for the root', () => {
    const { component, close } = setup({ parentId: 'news' });
    component.selectedKey.set('news');
    expect(component.canMove()).toBe(false);
    component.save();
    expect(close).not.toHaveBeenCalled();

    component.selectedKey.set('blog');
    expect(component.canMove()).toBe(true);
    component.save();
    expect(close).toHaveBeenCalledWith({ parentId: 'blog' });

    component.selectedKey.set(MOVE_ROOT_KEY);
    component.save();
    expect(close).toHaveBeenLastCalledWith({ parentId: null });
  });
});
