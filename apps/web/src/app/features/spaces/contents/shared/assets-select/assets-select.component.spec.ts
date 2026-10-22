import { TestBed } from '@angular/core/testing';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { FormBuilder } from '@angular/forms';
import { signal } from '@angular/core';
import { AssetFile, AssetFileSummary, AssetFileType, AssetKind, SchemaFieldAssets, SchemaFieldKind, Space } from '@localess/shared';
import { SpaceStore } from '@core/stores/space.store';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { AssetsSelectComponent } from './assets-select.component';

function file(id: string, name: string): AssetFileSummary {
  return { id, name, extension: '.png', type: 'image/png', size: 1 };
}

describe('AssetsSelectComponent', () => {
  /** `files`: what `SpaceStore` holds (the space's files, light). */
  function setup(uris: string[] = [], files: AssetFileSummary[] = [], field: Partial<SchemaFieldAssets> = {}) {
    const assetFileById = signal(new Map(files.map(it => [it.id, it])));
    const loadAssetFiles = vi.fn();
    const open = vi.fn();

    TestBed.overrideComponent(AssetsSelectComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({
      providers: [
        { provide: HlmDialogService, useValue: { open } },
        { provide: SpaceStore, useValue: { assetFileById, loadAssetFiles } },
      ],
    });
    const fb = TestBed.inject(FormBuilder);
    const form = fb.array(uris.map(uri => fb.group({ uri: fb.control(uri), kind: fb.control(SchemaFieldKind.ASSET) })));
    const fixture = TestBed.createComponent(AssetsSelectComponent);
    fixture.componentRef.setInput('form', form);
    fixture.componentRef.setInput('component', { fileTypes: undefined, ...field } as unknown as SchemaFieldAssets);
    fixture.componentRef.setInput('space', { id: 'space-1' } as Space);
    fixture.detectChanges();
    return { component: fixture.componentInstance, assetFileById, loadAssetFiles, open, form };
  }

  it('openAssetSelectDialog() filters the dialog by fileType, what the schema editor saves', () => {
    const { component, open } = setup([], [], { fileType: AssetFileType.IMAGE });
    open.mockReturnValue({ closed$: of(undefined) });

    component.openAssetSelectDialog();

    expect(open.mock.calls[0][1].context.fileType).toBe(AssetFileType.IMAGE);
  });

  it('openAssetSelectDialog() falls back to the first of fileTypes (templates, older schemas)', () => {
    const { component, open } = setup([], [], { fileTypes: [AssetFileType.VIDEO] });
    open.mockReturnValue({ closed$: of(undefined) });

    component.openAssetSelectDialog();

    expect(open.mock.calls[0][1].context.fileType).toBe(AssetFileType.VIDEO);
  });

  it('asks SpaceStore for the files, and shows them from it in the form order, leaving out one gone', () => {
    const a1 = file('a1', 'First');
    const a2 = file('a2', 'Second');
    const { component, loadAssetFiles } = setup(['a2', 'gone', 'a1'], [a1, a2]);

    expect(loadAssetFiles).toHaveBeenCalled();
    expect(component.assets()).toEqual([a2, a1]);
  });

  it('shows a rename at once (live from SpaceStore)', () => {
    const { component, assetFileById } = setup(['a1'], [file('a1', 'First')]);

    assetFileById.set(new Map([['a1', file('a1', 'Renamed')]]));

    expect(component.assets().map(it => it.name)).toEqual(['Renamed']);
  });

  it('openAssetSelectDialog() appends selected assets and rebuilds the form', () => {
    const { component, open, form } = setup([], [file('a1', 'New')]);
    open.mockReturnValue({ closed$: of([{ id: 'a1', kind: AssetKind.FILE, name: 'New' } as AssetFile]) });

    component.openAssetSelectDialog();

    expect(component.assets().map(it => it.id)).toEqual(['a1']);
    expect(form.length).toBe(1);
    expect(form.at(0).value).toEqual({ uri: 'a1', kind: SchemaFieldKind.ASSET });
  });

  it('deleteAsset() removes the asset by id, also after one gone from the space', () => {
    const emitted: string[][] = [];
    const { component, form } = setup(['gone', 'a1', 'a2'], [file('a1', 'A'), file('a2', 'B')]);
    component.assetsChange.subscribe(v => emitted.push(v));

    component.deleteAsset('a1');

    expect(component.assets().map(a => a.id)).toEqual(['a2']);
    expect(form.controls.map(it => it.value.uri)).toEqual(['gone', 'a2']);
    expect(emitted).toEqual([['gone', 'a2']]);
  });

  it('assetDropDrop() reorders both the form array and the ids', () => {
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
