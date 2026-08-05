import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Asset, AssetKind } from '@shared/models/asset.model';
import { AssetService } from '@shared/services/asset.service';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { ExportDialogModel } from './export-dialog.model';
import { ExportDialogComponent } from './export-dialog.component';

describe('ExportDialogComponent', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function setup(data: ExportDialogModel, results: Asset[] = []) {
    const findAllByName = vi.fn().mockReturnValue(of(results));
    TestBed.overrideComponent(ExportDialogComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: AssetService, useValue: { findAllByName } },
      ],
    });
    const fixture = TestBed.createComponent(ExportDialogComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, findAllByName };
  }

  it('starts with no path selected', () => {
    const { component } = setup({ spaceId: 'space-1' });

    expect(component.form.value).toEqual({ path: null });
    expect(component.selectedItem()).toBeNull();
  });

  it('searches assets for the given space after the debounce window', async () => {
    vi.useFakeTimers();
    const asset = { id: 'a1', kind: AssetKind.FOLDER, name: 'Images' } as Asset;
    const { component, findAllByName } = setup({ spaceId: 'space-1' }, [asset]);
    findAllByName.mockClear();

    component.search.set('img');
    await vi.advanceTimersByTimeAsync(500);

    expect(findAllByName).toHaveBeenCalledWith('space-1', 'img', 5);
    expect(component.filteredAssets()).toEqual([asset]);
  });

  it('onValueChange() sets the selected item and its id as the form path', () => {
    const { component } = setup({ spaceId: 'space-1' });
    const asset = { id: 'a1', kind: AssetKind.FOLDER, name: 'Images' } as Asset;

    component.onValueChange(asset);

    expect(component.selectedItem()).toBe(asset);
    expect(component.form.value.path).toBe('a1');
  });

  it('onValueChange(null) clears the selection and the form path', () => {
    const { component } = setup({ spaceId: 'space-1' });
    const asset = { id: 'a1', kind: AssetKind.FOLDER, name: 'Images' } as Asset;
    component.onValueChange(asset);

    component.onValueChange(null);

    expect(component.selectedItem()).toBeNull();
    expect(component.form.value.path).toBeUndefined();
  });

  it('displayItem() shows the asset name, or an empty string when absent', () => {
    const { component } = setup({ spaceId: 'space-1' });
    const asset = { id: 'a1', kind: AssetKind.FOLDER, name: 'Images' } as Asset;

    expect(component['displayItem'](asset)).toBe('Images');
    expect(component['displayItem'](undefined)).toBe('');
  });
});
