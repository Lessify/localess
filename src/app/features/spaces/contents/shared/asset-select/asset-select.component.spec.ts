import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { AssetFile, AssetKind } from '@shared/models/asset.model';
import { SchemaFieldAsset, SchemaFieldKind } from '@shared/models/schema.model';
import { Space } from '@shared/models/space.model';
import { AssetService } from '@shared/services/asset.service';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { AssetSelectComponent } from './asset-select.component';

describe('AssetSelectComponent', () => {
  function setup(uri: string | null, kind: SchemaFieldKind.ASSET | null = SchemaFieldKind.ASSET) {
    const findById = vi.fn().mockReturnValue(of({ id: 'a1', kind: AssetKind.FILE, name: 'photo', type: 'image/png' } as AssetFile));
    const open = vi.fn();

    TestBed.overrideComponent(AssetSelectComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({
      providers: [
        { provide: AssetService, useValue: { findById } },
        { provide: MatDialog, useValue: { open } },
      ],
    });
    const fb = TestBed.inject(FormBuilder);
    const form = fb.group({ uri: fb.control(uri), kind: fb.control(kind) });
    const fixture = TestBed.createComponent(AssetSelectComponent);
    fixture.componentRef.setInput('form', form);
    fixture.componentRef.setInput('component', { fileTypes: undefined } as unknown as SchemaFieldAsset);
    fixture.componentRef.setInput('space', { id: 'space-1' } as Space);
    fixture.detectChanges();
    return { component: fixture.componentInstance, findById, open, form };
  }

  it('defaults the kind to ASSET when unset', () => {
    const { form } = setup(null, null);

    expect(form.value.kind).toBe(SchemaFieldKind.ASSET);
  });

  it('loads the asset when a uri is already set', () => {
    const { component, findById } = setup('a1');

    expect(findById).toHaveBeenCalledWith('space-1', 'a1');
    expect(component.asset()?.id).toBe('a1');
  });

  it('does not load an asset when there is no uri', () => {
    const { findById } = setup(null);

    expect(findById).not.toHaveBeenCalled();
  });

  it('openAssetSelectDialog() sets the asset and form fields from the dialog result', () => {
    const { component, open, form } = setup(null);
    const selected = { id: 'a2', kind: AssetKind.FILE, name: 'new', type: 'image/png' } as AssetFile;
    open.mockReturnValue({ afterClosed: () => of([selected]) });

    component.openAssetSelectDialog();

    expect(component.asset()).toEqual(selected);
    expect(form.value).toEqual({ uri: 'a2', kind: SchemaFieldKind.ASSET });
  });

  it('openAssetSelectDialog() does nothing when the dialog is dismissed', () => {
    const { component, open } = setup(null);
    open.mockReturnValue({ afterClosed: () => of(undefined) });

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
