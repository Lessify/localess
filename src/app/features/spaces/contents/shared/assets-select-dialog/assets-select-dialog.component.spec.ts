import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Asset, AssetFile, AssetFolder, AssetKind } from '@shared/models/asset.model';
import { NotificationService } from '@shared/services/notification.service';
import { AssetService } from '@shared/services/asset.service';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { AssetsSelectDialogModel } from './assets-select-dialog.model';
import { AssetsSelectDialogComponent } from './assets-select-dialog.component';

function file(overrides: Partial<AssetFile> = {}): AssetFile {
  return { id: 'a1', kind: AssetKind.FILE, name: 'photo', type: 'image/png', parentPath: '', ...overrides } as AssetFile;
}

function folder(overrides: Partial<AssetFolder> = {}): AssetFolder {
  return { id: 'f1', kind: AssetKind.FOLDER, name: 'Images', parentPath: '', ...overrides } as AssetFolder;
}

describe('AssetsSelectDialogComponent', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  function setup(data: AssetsSelectDialogModel, assets: Asset[] = []) {
    const findAll = vi.fn().mockReturnValue(of(assets));
    const createFile = vi.fn().mockReturnValue(of({ id: 'new' }));
    const error = vi.fn();

    TestBed.overrideComponent(AssetsSelectDialogComponent, {
      set: { template: '<table llTableSort></table><ll-paginator [length]="0" />' },
    });
    TestBed.configureTestingModule({
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: AssetService, useValue: { findAll, createFile } },
        { provide: NotificationService, useValue: { error } },
      ],
    });
    const fixture = TestBed.createComponent(AssetsSelectDialogComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, findAll, createFile, error };
  }

  it('loads root assets on init', () => {
    const assets = [file({ id: 'a1' }), folder({ id: 'f1' })];
    const { component, findAll } = setup({ spaceId: 'space-1' }, assets);

    expect(findAll).toHaveBeenCalledWith('space-1', '', undefined);
    expect(component.dataSource.filteredData()).toEqual(assets);
    expect(component.isLoading()).toBe(false);
  });

  it('onAssetSelect() toggles selection for files', () => {
    const { component } = setup({ spaceId: 'space-1' });
    const f = file({ id: 'a1' });

    component.onAssetSelect(f);

    expect(component.selection.isSelected(f)).toBe(true);
  });

  it('onAssetSelect() navigates into folders', () => {
    const { component, findAll } = setup({ spaceId: 'space-1' });
    findAll.mockClear();

    component.onAssetSelect(folder({ id: 'f1', name: 'Images', parentPath: '' }));

    expect(findAll).toHaveBeenCalledWith('space-1', 'f1', undefined);
    expect(component.assetPath).toEqual([{ name: 'Root', fullSlug: '' }, { name: 'Images', fullSlug: 'f1' }]);
  });

  it('navigateToSlug() truncates the path after the target segment', () => {
    const { component } = setup({ spaceId: 'space-1' });
    component.onAssetSelect(folder({ id: 'a', name: 'A', parentPath: '' }));
    component.onAssetSelect(folder({ id: 'b', name: 'B', parentPath: 'a' }));

    component.navigateToSlug({ name: 'A', fullSlug: 'a' });

    expect(component.assetPath).toEqual([{ name: 'Root', fullSlug: '' }, { name: 'A', fullSlug: 'a' }]);
  });

  it('fileIcon()/filePreview() classify by mime type', () => {
    const { component } = setup({ spaceId: 'space-1' });

    expect(component.fileIcon('image/png')).toBeTruthy();
    expect(component.filePreview('image/png')).toBe(true);
    expect(component.filePreview('application/pdf')).toBe(false);
  });

  it('onFileUpload() queues and uploads a selected file', () => {
    const { component, createFile } = setup({ spaceId: 'space-1' });
    const input = document.createElement('input');
    input.type = 'file';
    const uploaded = new File(['data'], 'photo.png');
    Object.defineProperty(input, 'files', { value: [uploaded] });

    component.onFileUpload({ target: input } as unknown as Event);

    expect(createFile).toHaveBeenCalledWith('space-1', '', uploaded);
    expect(component.fileUploadQueue()).toEqual([]);
  });

  it('notifies an error when a queued upload fails', () => {
    const { component, createFile, error } = setup({ spaceId: 'space-1' });
    createFile.mockReturnValue(throwError(() => new Error('boom')));
    const input = document.createElement('input');
    input.type = 'file';
    const uploaded = new File(['data'], 'photo.png');
    Object.defineProperty(input, 'files', { value: [uploaded] });

    component.onFileUpload({ target: input } as unknown as Event);

    expect(error).toHaveBeenCalledWith('Asset can not be uploaded.');
  });
});
