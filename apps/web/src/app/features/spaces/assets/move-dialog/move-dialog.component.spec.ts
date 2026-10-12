import { TestBed } from '@angular/core/testing';
import { DIALOG_DATA } from '@angular/cdk/dialog';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { Asset, AssetFolderSummary } from '@localess/shared';
import { AssetService } from '@core/services/asset.service';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { MoveDialogContext } from './move-dialog.model';
import { MoveDialogComponent } from './move-dialog.component';

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
    const findAllFolders = vi.fn().mockReturnValue(of(FOLDERS));
    const context: MoveDialogContext = { spaceId: 'space-1', asset: { id: 'a1', kind: 'FILE', ...asset } as Asset };
    TestBed.overrideComponent(MoveDialogComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({
      providers: [
        { provide: DIALOG_DATA, useValue: context },
        { provide: BrnDialogRef, useValue: { close } },
        { provide: AssetService, useValue: { findAllFolders } },
      ],
    });
    const fixture = TestBed.createComponent(MoveDialogComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, close, findAllFolders };
  }
  const paths = (component: MoveDialogComponent) => component.options().map(it => it.path);

  it('starts with nothing chosen, from the folders of the space', () => {
    const { component, findAllFolders } = setup({ parentId: 'news' });
    expect(findAllFolders).toHaveBeenCalledWith('space-1');
    expect(component.selected()).toBeNull();
    expect(component.form.invalid).toBe(true);
  });

  it('offers the root and every folder by path, leaving out the current folder', () => {
    const { component } = setup({ parentId: 'news' });
    expect(paths(component)).toEqual(['', 'Blog', 'Blog/2026', 'Blog/2026/June']);
  });

  it('does not offer the root to an item already there', () => {
    const { component } = setup({});
    expect(paths(component)).toEqual(['Blog', 'Blog/2026', 'Blog/2026/June', 'News']);
  });

  it('leaves out a moved folder and everything under it', () => {
    const { component } = setup({ id: 'y2026', kind: 'FOLDER', parentId: 'blog' } as Partial<Asset>);
    expect(paths(component)).toEqual(['', 'News']);
  });

  it('filters by name or path', () => {
    const { component } = setup({ parentId: 'news' });
    component.search.set('jun');
    expect(paths(component)).toEqual(['Blog/2026/June']);
    component.search.set('2026');
    expect(paths(component)).toEqual(['Blog/2026', 'Blog/2026/June']);
  });

  it('closes with the chosen folder, or null for the root', () => {
    const { component, close } = setup({ parentId: 'news' });
    component.choose(component.options().find(it => it.path === 'Blog')!);
    expect(component.form.valid).toBe(true);
    component.save();
    expect(close).toHaveBeenCalledWith({ parentId: 'blog' });

    component.choose(component.options().find(it => it.path === '')!);
    component.save();
    expect(close).toHaveBeenLastCalledWith({ parentId: null });
  });

  it('shows a target as its name and path', () => {
    const { component } = setup({ parentId: 'news' });
    expect(component['displayItem'](component.options()[1])).toBe('Blog | Blog');
    expect(component['displayItem'](component.options()[0])).toBe('Root | ~');
    expect(component['displayItem'](undefined)).toBe('');
  });
});
