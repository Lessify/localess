import { TestBed } from '@angular/core/testing';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { FormBuilder } from '@angular/forms';
import { signal } from '@angular/core';
import { AssetFile, AssetFileSummary, AssetFileType, AssetKind, SchemaFieldAsset, SchemaFieldKind, Space } from '@localess/shared';
import { SpaceStore } from '@core/stores/space.store';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { AssetSelectComponent } from './asset-select.component';

const photo: AssetFileSummary = { id: 'a1', name: 'photo', extension: '.png', type: 'image/png', size: 1 };

describe('AssetSelectComponent', () => {
  function setup(uri: string | null, kind: SchemaFieldKind.ASSET | null = SchemaFieldKind.ASSET, field: Partial<SchemaFieldAsset> = {}) {
    // What SpaceStore holds: the space's files, light.
    const assetFileById = signal(
      new Map<string, AssetFileSummary>([
        ['a1', photo],
        ['a2', { ...photo, id: 'a2', name: 'new' }],
      ]),
    );
    const loadAssetFiles = vi.fn();
    const open = vi.fn();

    TestBed.overrideComponent(AssetSelectComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({
      providers: [
        { provide: HlmDialogService, useValue: { open } },
        { provide: SpaceStore, useValue: { assetFileById, loadAssetFiles } },
      ],
    });
    const fb = TestBed.inject(FormBuilder);
    const form = fb.group({ uri: fb.control(uri), kind: fb.control(kind) });
    const fixture = TestBed.createComponent(AssetSelectComponent);
    fixture.componentRef.setInput('form', form);
    fixture.componentRef.setInput('component', { fileTypes: undefined, ...field } as unknown as SchemaFieldAsset);
    fixture.componentRef.setInput('space', { id: 'space-1' } as Space);
    fixture.detectChanges();
    return { component: fixture.componentInstance, assetFileById, loadAssetFiles, open, form };
  }

  it('openAssetSelectDialog() filters the dialog by fileType, what the schema editor saves', () => {
    const { component, open } = setup(null, SchemaFieldKind.ASSET, { fileType: AssetFileType.IMAGE });
    open.mockReturnValue({ closed$: of(undefined) });

    component.openAssetSelectDialog();

    expect(open.mock.calls[0][1].context.fileType).toBe(AssetFileType.IMAGE);
  });

  it('openAssetSelectDialog() falls back to the first of fileTypes (templates, older schemas)', () => {
    const { component, open } = setup(null, SchemaFieldKind.ASSET, { fileTypes: [AssetFileType.VIDEO] });
    open.mockReturnValue({ closed$: of(undefined) });

    component.openAssetSelectDialog();

    expect(open.mock.calls[0][1].context.fileType).toBe(AssetFileType.VIDEO);
  });

  it('defaults the kind to ASSET when unset', () => {
    const { form } = setup(null, null);

    expect(form.value.kind).toBe(SchemaFieldKind.ASSET);
  });

  it('shows the file of the uri from SpaceStore, live, after asking it for the files', () => {
    const { component, assetFileById, loadAssetFiles } = setup('a1');

    expect(loadAssetFiles).toHaveBeenCalled();
    expect(component.asset()?.name).toBe('photo');
    assetFileById.set(new Map([['a1', { ...photo, name: 'renamed' }]]));
    expect(component.asset()?.name).toBe('renamed');
  });

  it('shows nothing without a uri, or for a file gone from the space', () => {
    expect(setup(null).component.asset()).toBeUndefined();
    TestBed.resetTestingModule();
    expect(setup('gone').component.asset()).toBeUndefined();
  });

  it('openAssetSelectDialog() sets the asset and form fields from the dialog result', () => {
    const { component, open, form } = setup(null);
    const selected = { id: 'a2', kind: AssetKind.FILE, name: 'new', type: 'image/png' } as AssetFile;
    open.mockReturnValue({ closed$: of([selected]) });

    component.openAssetSelectDialog();

    expect(component.asset()?.name).toBe('new');
    expect(form.value).toEqual({ uri: 'a2', kind: SchemaFieldKind.ASSET });
  });

  it('openAssetSelectDialog() does nothing when the dialog is dismissed', () => {
    const { component, open } = setup(null);
    open.mockReturnValue({ closed$: of(undefined) });

    component.openAssetSelectDialog();

    expect(component.asset()).toBeUndefined();
  });

  it('deleteAsset() clears the asset and the form uri', () => {
    const { component, form } = setup('a1');

    component.deleteAsset();

    expect(component.asset()).toBeUndefined();
    expect(form.value.uri).toBeNull();
  });
});
