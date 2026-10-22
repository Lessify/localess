import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DIALOG_DATA } from '@angular/cdk/dialog';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { SpaceStore } from '@core/stores/space.store';
import { ContentSummaryWithPath, withFullSlugs } from '@core/utils/content-summaries';
import { Content, ContentKind } from '@localess/shared';
import { vi } from 'vitest';

import { MoveDialogContext } from './move-dialog.model';
import { MoveDialogComponent } from './move-dialog.component';

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
  const paths = (component: MoveDialogComponent) => component.options().map(it => it.path);

  it('starts with nothing chosen, from the folders of the space', () => {
    const { component } = setup({ parentId: 'news' });
    expect(component.selected()).toBeNull();
    expect(component.form.invalid).toBe(true);
  });

  it('offers the root and every folder by path, leaving out the current folder', () => {
    const { component } = setup({ parentId: 'news' });
    expect(paths(component)).toEqual(['', 'blog', 'blog/2026', 'blog/2026/june']);
  });

  it('does not offer the root to an item already there', () => {
    const { component } = setup({});
    expect(paths(component)).toEqual(['blog', 'blog/2026', 'blog/2026/june', 'news']);
  });

  it('leaves out a moved folder and everything under it', () => {
    const { component } = setup({ id: 'y2026', kind: 'FOLDER', parentId: 'blog' } as Partial<Content>);
    expect(paths(component)).toEqual(['', 'news']);
  });

  it('filters by name or path', () => {
    const { component } = setup({ parentId: 'news' });
    component.search.set('jun');
    expect(paths(component)).toEqual(['blog/2026/june']);
    component.search.set('2026');
    expect(paths(component)).toEqual(['blog/2026', 'blog/2026/june']);
  });

  it('closes with the chosen folder, or null for the root', () => {
    const { component, close } = setup({ parentId: 'news' });
    component.choose(component.options().find(it => it.path === 'blog')!);
    expect(component.form.valid).toBe(true);
    component.save();
    expect(close).toHaveBeenCalledWith({ parentId: 'blog' });

    component.choose(component.options().find(it => it.path === '')!);
    component.save();
    expect(close).toHaveBeenLastCalledWith({ parentId: null });
  });

  it('shows a target as its name and path', () => {
    const { component } = setup({ parentId: 'news' });
    expect(component['displayItem'](component.options()[1])).toBe('Blog | blog');
    expect(component['displayItem'](component.options()[0])).toBe('Root | ~');
    expect(component['displayItem'](undefined)).toBe('');
  });
});
