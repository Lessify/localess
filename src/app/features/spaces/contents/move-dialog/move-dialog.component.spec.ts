import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ContentFolder } from '@shared/models/content.model';
import { ContentService } from '@shared/services/content.service';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { MoveDialogModel } from './move-dialog.model';
import { MoveDialogComponent } from './move-dialog.component';

describe('MoveDialogComponent', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function setup(data: MoveDialogModel, results: ContentFolder[] = []) {
    const findAllFoldersByName = vi.fn().mockReturnValue(of(results));
    TestBed.overrideComponent(MoveDialogComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: ContentService, useValue: { findAllFoldersByName } },
      ],
    });
    const fixture = TestBed.createComponent(MoveDialogComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, findAllFoldersByName };
  }

  it('starts with an invalid, unset path', () => {
    const { component } = setup({ spaceId: 'space-1' });

    expect(component.form.invalid).toBe(true);
    expect(component.selectedFolder()).toBeNull();
  });

  it('searches folders for the given space after the debounce window', async () => {
    vi.useFakeTimers();
    const folder = { id: 'f1', name: 'Docs', fullSlug: 'docs' } as ContentFolder;
    const { component, findAllFoldersByName } = setup({ spaceId: 'space-1' }, [folder]);
    findAllFoldersByName.mockClear();

    component.search.set('doc');
    await vi.advanceTimersByTimeAsync(500);

    expect(findAllFoldersByName).toHaveBeenCalledWith('space-1', 'doc', 5);
    expect(component.filteredFolders()).toEqual([folder]);
  });

  it('onValueChange() sets the path to the folder full slug', () => {
    const { component } = setup({ spaceId: 'space-1' });
    const folder = { id: 'f1', name: 'Docs', fullSlug: 'docs' } as ContentFolder;

    component['onValueChange'](folder);

    expect(component.selectedFolder()).toBe(folder);
    expect(component.form.value.path).toBe('docs');
  });

  it('onValueChange(null) clears the selection and the path', () => {
    const { component } = setup({ spaceId: 'space-1' });

    component['onValueChange'](null);

    expect(component.selectedFolder()).toBeNull();
    expect(component.form.value.path).toBeNull();
  });

  it('displayItem() shows the name and full slug, or an empty string when absent', () => {
    const { component } = setup({ spaceId: 'space-1' });
    const folder = { id: 'f1', name: 'Docs', fullSlug: 'docs' } as ContentFolder;

    expect(component['displayItem'](folder)).toBe('Docs | docs');
    expect(component['displayItem'](undefined)).toBe('');
  });

  it('exposes the root folder sentinel', () => {
    const { component } = setup({ spaceId: 'space-1' });

    expect(component.rootFolder).toEqual({ name: 'Root', fullSlug: '~' });
  });
});
