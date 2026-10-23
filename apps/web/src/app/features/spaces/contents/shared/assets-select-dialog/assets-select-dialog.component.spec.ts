import { HttpParams, provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { DIALOG_DATA } from '@angular/cdk/dialog';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { Asset, AssetFile, AssetFileType, AssetFolder, AssetKind } from '@localess/shared';
import { NotificationService } from '@core/services/notification.service';
import { AssetService } from '@core/services/asset.service';
import { SpaceStore } from '@core/stores/space.store';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { type Mock, vi } from 'vitest';

import { AssetsSelectDialogContext } from './assets-select-dialog.model';
import { AssetsSelectDialogComponent } from './assets-select-dialog.component';

function file(overrides: Partial<AssetFile> = {}): AssetFile {
  return { id: 'a1', kind: AssetKind.FILE, name: 'photo', type: 'image/png', ...overrides } as AssetFile;
}

function folder(overrides: Partial<AssetFolder> = {}): AssetFolder {
  return { id: 'f1', kind: AssetKind.FOLDER, name: 'Images', ...overrides } as AssetFolder;
}

/** Lets the page's resource take the answer (it resolves through a promise), then runs the effects. */
const settle = async () => {
  TestBed.tick();
  await new Promise(resolve => setTimeout(resolve));
  TestBed.tick();
};

describe('AssetsSelectDialogComponent', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  function setup(context: AssetsSelectDialogContext, assets: Asset[] = []) {
    const close = vi.fn();
    const findAll = vi.fn().mockReturnValue(of({ items: assets, page: 0, size: 20, total: assets.length }));
    const createFile = vi.fn().mockReturnValue(of({ id: 'new' }));
    const error = vi.fn();

    TestBed.overrideComponent(AssetsSelectDialogComponent, {
      set: { template: '<table llTableSort></table><ll-paginator [length]="0" />' },
    });
    TestBed.configureTestingModule({
      providers: [
        { provide: DIALOG_DATA, useValue: context },
        { provide: BrnDialogRef, useValue: { close } },
        {
          provide: AssetService,
          useValue: {
            findAll,
            createFile,
          },
        },
        {
          provide: SpaceStore,
          useValue: {
            assetFolders: signal([
              { id: 'a', name: 'A' },
              { id: 'b', name: 'B', parentId: 'a' },
            ]),
          },
        },
        { provide: NotificationService, useValue: { error } },
      ],
    });
    const fixture = TestBed.createComponent(AssetsSelectDialogComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, close, findAll, createFile, error };
  }

  /** The query of the last page read. */
  const lastQuery = (findAll: Mock) => (findAll.mock.calls.at(-1)![1] as HttpParams).toString();

  it('loads the root page on init, files of the field type', async () => {
    const assets = [file({ id: 'a1' }), folder({ id: 'f1' })];
    const { component, findAll } = setup({ spaceId: 'space-1', fileType: AssetFileType.IMAGE }, assets);
    await settle();

    expect(findAll).toHaveBeenCalledWith('space-1', expect.any(HttpParams));
    expect(lastQuery(findAll)).toBe('page=0&size=20&fileType=IMAGE');
    expect(component.dataSource.filteredData()).toEqual(assets);
    expect(component.page.total()).toBe(2);
    expect(component.page.loading()).toBe(false);
  });

  it('onAssetSelect() toggles selection for files', () => {
    const { component } = setup({ spaceId: 'space-1' });
    const f = file({ id: 'a1' });

    component.onAssetSelect(f);

    expect(component.selection.isSelected(f)).toBe(true);
  });

  it('onAssetSelect() navigates into folders: one request, for the folder opened', async () => {
    const { component, findAll } = setup({ spaceId: 'space-1' });
    await settle();
    findAll.mockClear();

    component.onAssetSelect(folder({ id: 'f1', name: 'Images' }));
    await settle();

    expect(findAll).toHaveBeenCalledTimes(1);
    expect(lastQuery(findAll)).toBe('page=0&size=20&parentId=f1');
  });

  it('keeps the field type through a search, and the selection across folders', () => {
    const { component, findAll } = setup({ spaceId: 'space-1', multiple: true, fileType: AssetFileType.IMAGE });
    const first = file({ id: 'a1' });
    component.onAssetSelect(first);

    component.onAssetSelect(folder({ id: 'a', name: 'A' }));
    component.assetList.onFilterChange({ search: 'sun', scope: 'deep' });
    TestBed.tick();
    expect(lastQuery(findAll)).toBe('page=0&size=20&fileType=IMAGE&search=sun&deep=true&parentId=a');

    component.onAssetSelect(file({ id: 'a2', parentId: 'b' }));
    expect(component.selection.selected.map(it => it.id)).toEqual(['a1', 'a2']);
    expect(component.location()(file({ parentId: 'b' }))).toBe('~/A/B');
  });

  it('builds the breadcrumbs from the folder map, and goes back by folder id', () => {
    const { component } = setup({ spaceId: 'space-1' });
    component.onAssetSelect(folder({ id: 'a', name: 'A' }));
    component.onAssetSelect(folder({ id: 'b', name: 'B', parentId: 'a' }));
    expect(component.trail().map(it => it.name)).toEqual(['A', 'B']);

    component.navigateToFolder('a');
    expect(component.trail().map(it => it.name)).toEqual(['A']);
    component.navigateToFolder(null);
    expect(component.trail()).toEqual([]);
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

    expect(createFile).toHaveBeenCalledWith('space-1', undefined, uploaded);
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

    expect(error).toHaveBeenCalledWith('photo.png could not be uploaded.');
    expect(component.fileUploadQueue()).toEqual([]);
  });

  it('keeps uploading after a failed file, in the same batch and in later picks', () => {
    const { component, createFile, error } = setup({ spaceId: 'space-1' });
    const [first, broken, third, later] = ['a.png', 'b.png', 'c.png', 'd.png'].map(name => new File(['data'], name));
    createFile.mockImplementation((_space: string, _path: string, file: File) =>
      file === broken ? throwError(() => new Error('boom')) : of({ id: file.name }),
    );
    const pick = (...files: File[]) => {
      const input = document.createElement('input');
      input.type = 'file';
      Object.defineProperty(input, 'files', { value: files });
      component.onFileUpload({ target: input } as unknown as Event);
    };

    pick(first, broken, third);
    pick(later);

    expect(createFile.mock.calls.map(([, , file]) => file)).toEqual([first, broken, third, later]);
    expect(error).toHaveBeenCalledExactlyOnceWith('b.png could not be uploaded.');
    expect(component.fileUploadQueue()).toEqual([]);
  });
  /**
   * Renders the real template, unlike `setup` above, which stubs it out.
   *
   * `strictTemplates` is off in this project, so a template binding to a member that does not
   * exist compiles cleanly and silently evaluates to `undefined`. That is exactly how the asset
   * thumbnails shipped pointing at `/api/v1/spaces/undefined/assets/...`. Only a render catches it.
   */
  it('builds thumbnail URLs from the dialog context, not a missing member', async () => {
    const asset = file({ id: 'a1', type: 'image/png' });
    await TestBed.configureTestingModule({
      providers: [
        { provide: DIALOG_DATA, useValue: { spaceId: 'space-1' } },
        { provide: BrnDialogRef, useValue: { close: vi.fn() } },
        {
          provide: AssetService,
          useValue: {
            findAll: vi.fn().mockReturnValue(of({ items: [asset], page: 0, size: 20, total: 1 })),
            createFile: vi.fn(),
          },
        },
        { provide: SpaceStore, useValue: { assetFolders: signal([]) } },
        { provide: NotificationService, useValue: { error: vi.fn() } },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(AssetsSelectDialogComponent);
    fixture.detectChanges();

    const html: string = fixture.nativeElement.innerHTML;

    expect(html).not.toContain('/spaces/undefined/');
  });
});
