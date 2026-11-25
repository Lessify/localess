import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DIALOG_DATA } from '@angular/cdk/dialog';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { SpaceStore } from '@core/stores/space.store';
import { ContentSummaryWithPath, withFullSlugs } from '@core/utils/content-summaries';
import { Content, ContentKind } from '@localess/shared';
import { vi } from 'vitest';

import { MoveDialogContext, MoveTarget } from './move-dialog.model';
import { MOVE_ROOT_KEY, MoveDialogComponent } from './move-dialog.component';

// blog, blog/2026, blog/2026/june, news
const FOLDERS: ContentSummaryWithPath[] = withFullSlugs(
  [
    { id: 'blog', name: 'Blog', slug: 'blog' },
    { id: 'y2026', name: '2026', slug: '2026', parentId: 'blog' },
    { id: 'june', name: 'June', slug: 'june', parentId: 'y2026' },
    { id: 'news', name: 'News', slug: 'news' },
  ].map(it => ({ ...it, kind: ContentKind.FOLDER, updatedAt: '' })),
);

describe('MoveDialogComponent', () => {
  function setup(content: Partial<Content>) {
    const close = vi.fn();
    const context: MoveDialogContext = { spaceId: 'space-1', content: { id: 'c1', kind: 'DOCUMENT', ...content } as Content };
    TestBed.overrideComponent(MoveDialogComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({
      providers: [
        { provide: DIALOG_DATA, useValue: context },
        { provide: BrnDialogRef, useValue: { close } },
        { provide: SpaceStore, useValue: { contentFolders: signal(FOLDERS) } },
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

  it('marks the root when the item is there', () => {
    const { component } = setup({});
    expect(outline(component)[0]).toBe('Root *');
  });

  it('leaves out a moved folder and everything under it', () => {
    const { component } = setup({ id: 'y2026', kind: 'FOLDER', parentId: 'blog' } as Partial<Content>);
    expect(outline(component)).toEqual(['Root', '  Blog *', '  News']);
  });

  it('filters by name or path, keeping the parents, with every branch open', () => {
    const { component } = setup({ parentId: 'news' });
    component.search.set('jun');
    expect(outline(component)).toEqual(['Root', '  Blog', '    2026', '      June']);
    expect(component.shownExpandedKeys().has('y2026')).toBe(true);
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
