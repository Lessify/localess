import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AssetFolder } from '@shared/models/asset.model';
import { AssetService } from '@shared/services/asset.service';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { MoveDialogModel } from './move-dialog.model';
import { MoveDialogComponent } from './move-dialog.component';

describe('MoveDialogComponent', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function setup(data: MoveDialogModel, results: AssetFolder[] = []) {
    const findAllFoldersByName = vi.fn().mockReturnValue(of(results));
    TestBed.overrideComponent(MoveDialogComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: AssetService, useValue: { findAllFoldersByName } },
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
    const folder = { id: 'f1', name: 'Images', parentPath: '' } as AssetFolder;
    const { component, findAllFoldersByName } = setup({ spaceId: 'space-1' }, [folder]);
    findAllFoldersByName.mockClear();

    component.search.set('img');
    await vi.advanceTimersByTimeAsync(500);

    expect(findAllFoldersByName).toHaveBeenCalledWith('space-1', 'img', 5);
    expect(component.filteredFolders()).toEqual([folder]);
  });

  it('onValueChange(null) clears the selection and the path', () => {
    const { component } = setup({ spaceId: 'space-1' });

    component['onValueChange'](null);

    expect(component.selectedFolder()).toBeNull();
    expect(component.form.value.path).toBeNull();
  });

  it('onValueChange() sets the path to "~" for the root folder sentinel', () => {
    const { component } = setup({ spaceId: 'space-1' });

    component['onValueChange'](component.rootFolder);

    expect(component.form.value.path).toBe('~');
  });

  it('onValueChange() composes the parent path for a top-level folder', () => {
    const { component } = setup({ spaceId: 'space-1' });
    const folder = { id: 'f1', name: 'Images', parentPath: '' } as AssetFolder;

    component['onValueChange'](folder);

    expect(component.form.value.path).toBe('f1');
  });

  it('onValueChange() composes the parent path for a nested folder', () => {
    const { component } = setup({ spaceId: 'space-1' });
    const folder = { id: 'f2', name: 'Nested', parentPath: 'f1' } as AssetFolder;

    component['onValueChange'](folder);

    expect(component.form.value.path).toBe('f1/f2');
  });

  it('displayItem() shows "Root" with a separator for the root sentinel', () => {
    const { component } = setup({ spaceId: 'space-1' });

    expect(component['displayItem'](component.rootFolder)).toBe('Root | ~');
  });

  it('displayItem() shows the folder name for a regular folder, or an empty string when absent', () => {
    const { component } = setup({ spaceId: 'space-1' });
    const folder = { id: 'f1', name: 'Images', parentPath: '' } as AssetFolder;

    expect(component['displayItem'](folder)).toBe('Images');
    expect(component['displayItem'](undefined)).toBe('');
  });
});
