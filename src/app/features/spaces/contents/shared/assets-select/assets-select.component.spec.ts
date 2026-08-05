import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { AssetFile, AssetKind } from '@shared/models/asset.model';
import { SchemaFieldAssets, SchemaFieldKind } from '@shared/models/schema.model';
import { Space } from '@shared/models/space.model';
import { AssetService } from '@shared/services/asset.service';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { AssetsSelectComponent } from './assets-select.component';

function file(id: string, name: string): AssetFile {
  return { id, kind: AssetKind.FILE, name, type: 'image/png' } as AssetFile;
}

describe('AssetsSelectComponent', () => {
  function setup(uris: string[] = [], results: AssetFile[] = []) {
    const findByIds = vi.fn().mockReturnValue(of(results));
    const open = vi.fn();

    TestBed.overrideComponent(AssetsSelectComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({
      providers: [
        { provide: AssetService, useValue: { findByIds } },
        { provide: MatDialog, useValue: { open } },
      ],
    });
    const fb = TestBed.inject(FormBuilder);
    const form = fb.array(uris.map(uri => fb.group({ uri: fb.control(uri), kind: fb.control(SchemaFieldKind.ASSET) })));
    const fixture = TestBed.createComponent(AssetsSelectComponent);
    fixture.componentRef.setInput('form', form);
    fixture.componentRef.setInput('component', { fileTypes: undefined } as unknown as SchemaFieldAssets);
    fixture.componentRef.setInput('space', { id: 'space-1' } as Space);
    fixture.detectChanges();
    return { component: fixture.componentInstance, findByIds, open, form };
  }

  it('does not load anything when there are no uris', () => {
    const { findByIds } = setup([]);

    expect(findByIds).not.toHaveBeenCalled();
  });

  it('loads assets preserving the original uri order', () => {
    const a1 = file('a1', 'First');
    const a2 = file('a2', 'Second');
    const { component, findByIds } = setup(['a2', 'a1'], [a1, a2]);

    expect(findByIds).toHaveBeenCalledWith('space-1', ['a2', 'a1']);
    expect(component.assets()).toEqual([a2, a1]);
  });

  it('openAssetSelectDialog() appends selected assets and rebuilds the form', () => {
    const { component, open, form } = setup([]);
    const selected = [file('a1', 'New')];
    open.mockReturnValue({ afterClosed: () => of(selected) });

    component.openAssetSelectDialog();

    expect(component.assets()).toEqual(selected);
    expect(form.length).toBe(1);
    expect(form.at(0).value).toEqual({ uri: 'a1', kind: SchemaFieldKind.ASSET });
  });

  it('deleteAsset() removes the asset at the given index', () => {
    const emitted: string[][] = [];
    const { component, form } = setup(['a1', 'a2'], [file('a1', 'A'), file('a2', 'B')]);
    component.assetsChange.subscribe(v => emitted.push(v));

    component.deleteAsset(0);

    expect(component.assets().map(a => a.id)).toEqual(['a2']);
    expect(form.length).toBe(1);
    expect(emitted).toEqual([['a2']]);
  });

  it('assetDropDrop() reorders both the form array and the assets signal', () => {
    const { component, form } = setup(['a1', 'a2'], [file('a1', 'A'), file('a2', 'B')]);

    component.assetDropDrop({ previousIndex: 0, currentIndex: 1 } as never);

    expect(component.assets().map(a => a.id)).toEqual(['a2', 'a1']);
    expect(form.at(0).value.uri).toBe('a2');
    expect(form.at(1).value.uri).toBe('a1');
  });

  it('assetDropDrop() no-ops when the index is unchanged', () => {
    const { component } = setup(['a1'], [file('a1', 'A')]);

    component.assetDropDrop({ previousIndex: 0, currentIndex: 0 } as never);

    expect(component.assets().map(a => a.id)).toEqual(['a1']);
  });
});
