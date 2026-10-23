import { HttpErrorResponse, HttpParams } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { Asset, AssetFile, AssetFolder, AssetKind } from '@localess/shared';
import { AssetService } from '@core/services/asset.service';
import { NotificationService } from '@core/services/notification.service';
import { TaskService } from '@core/services/task.service';
import { UnsplashService } from '@core/services/unsplash.service';
import { SpaceStore } from '@core/stores/space.store';
import { signal } from '@angular/core';
import { of, Subject, throwError } from 'rxjs';
import { type Mock, vi } from 'vitest';

import { AssetsComponent } from './assets.component';

function file(overrides: Partial<AssetFile> = {}): AssetFile {
  return { id: 'a1', kind: AssetKind.FILE, name: 'photo', type: 'image/png', size: 10, ...overrides } as AssetFile;
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

describe('AssetsComponent', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  function setup(folderId: string | null = null) {
    const findAll = vi.fn().mockReturnValue(of({ items: [], page: 0, size: 20, total: 0 }));
    const createFile = vi.fn().mockReturnValue(of({ id: 'new-file' }));
    const importFile = vi.fn().mockReturnValue(of({ id: 'new-file' }));
    const createFolder = vi.fn().mockReturnValue(of(undefined));
    const update = vi.fn().mockReturnValue(of({}));
    const remove = vi.fn().mockReturnValue(of(undefined));
    const findUsage = vi.fn().mockReturnValue(of({ contents: 0 }));
    const move = vi.fn().mockReturnValue(of(undefined));
    const createAssetImportTask = vi.fn().mockReturnValue(of({ id: 't1' }));
    const createAssetExportTask = vi.fn().mockReturnValue(of({ id: 't1' }));
    const createAssetRegenerateMetadataTask = vi.fn().mockReturnValue(of({ id: 't1' }));
    const success = vi.fn();
    const error = vi.fn();
    const open = vi.fn();
    const changeAssetFolder = vi.fn();
    const assetFolderId = signal<string | null>(folderId);
    const assetFolders = signal([
      { id: 'f1', name: 'Images' },
      { id: 'f2', name: '2026', parentId: 'f1' },
    ]);

    TestBed.overrideComponent(AssetsComponent, { set: { template: '<ll-paginator [length]="0" />' } });
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AssetService,
          useValue: {
            findAll,
            createFile,
            importFile,
            createFolder,
            update,
            remove,
            move,
            findUsage,
          },
        },
        { provide: TaskService, useValue: { createAssetImportTask, createAssetExportTask, createAssetRegenerateMetadataTask } },
        { provide: NotificationService, useValue: { success, error } },
        { provide: HlmDialogService, useValue: { open } },
        { provide: UnsplashService, useValue: { enabled: () => false } },
        { provide: SpaceStore, useValue: { assetFolderId, changeAssetFolder, assetFolders } },
      ],
    });
    const fixture = TestBed.createComponent(AssetsComponent);
    fixture.componentRef.setInput('spaceId', 'space-1');
    fixture.detectChanges();
    return {
      component: fixture.componentInstance,
      findAll,
      createFile,
      importFile,
      createFolder,
      update,
      remove,
      findUsage,
      move,
      createAssetImportTask,
      createAssetExportTask,
      createAssetRegenerateMetadataTask,
      success,
      error,
      open,
      changeAssetFolder,
      assetFolderId,
    };
  }

  /** The query of the last page read. */
  const lastQuery = (findAll: Mock) => (findAll.mock.calls.at(-1)![1] as HttpParams).toString();

  it('loads the root page on init', async () => {
    const { component, findAll } = setup();
    await settle();

    expect(findAll).toHaveBeenCalledTimes(1);
    expect(findAll).toHaveBeenCalledWith('space-1', expect.any(HttpParams));
    expect(lastQuery(findAll)).toBe('page=0&size=20');
    expect(component.page.loading()).toBe(false);
  });

  it('asks once for a folder opened, from its first page (never for the folder left)', async () => {
    const { component, findAll, assetFolderId } = setup();
    await settle();
    component.assetList.list.page.set(2);
    await settle();
    findAll.mockClear();

    assetFolderId.set('f1');
    await settle();

    expect(findAll).toHaveBeenCalledTimes(1);
    expect(lastQuery(findAll)).toBe('page=0&size=20&parentId=f1');
  });

  it('loads the page of the current folder', () => {
    const { findAll } = setup('f2');

    expect(lastQuery(findAll)).toBe('page=0&size=20&parentId=f2');
  });

  it('pages, sorts, searches and widens the scope on the server, from the first page again', () => {
    const { component, findAll } = setup('f2');
    component.assetList.list.page.set(2);
    TestBed.tick();
    expect(lastQuery(findAll)).toBe('page=2&size=20&parentId=f2');

    component.assetList.onSortChange({ active: 'size', direction: 'desc' });
    TestBed.tick();
    expect(lastQuery(findAll)).toBe('page=0&size=20&sort=size&direction=desc&parentId=f2');

    component.assetList.onFilterChange({ search: ' logo ', scope: 'deep' });
    TestBed.tick();
    expect(lastQuery(findAll)).toBe('page=0&size=20&sort=size&direction=desc&search=logo&deep=true&parentId=f2');
  });

  it('shows where each asset is only for a list from several folders', () => {
    const { component } = setup('f1');
    const photo = { id: 'a1', kind: AssetKind.FILE, name: 'photo', parentId: 'f2' } as Asset;
    expect(component.location()(photo)).toBeUndefined();

    component.assetList.onFilterChange({ search: '', scope: 'deep' });
    expect(component.location()(photo)).toBe('~/Images/2026');
    expect(component.location()({ ...photo, parentId: undefined })).toBe('~');
  });

  describe('onFileUpload', () => {
    it('queues and uploads a selected file', () => {
      const { component, createFile } = setup();
      const input = document.createElement('input');
      input.type = 'file';
      const uploadedFile = new File(['data'], 'photo.png');
      Object.defineProperty(input, 'files', { value: [uploadedFile] });

      component.onFileUpload({ target: input } as unknown as Event);

      expect(createFile).toHaveBeenCalledWith('space-1', undefined, uploadedFile);
      expect(component.fileUploadQueue()).toEqual([]);
    });

    it('reports a failed file and keeps uploading the rest of the batch and later picks', () => {
      const { component, createFile, error } = setup();
      const [first, broken, third, later] = ['a.png', 'b.png', 'c.png', 'd.png'].map(name => new File(['data'], name));
      createFile.mockImplementation((_space: string, _path: string, file: File) =>
        file === broken ? throwError(() => new HttpErrorResponse({ status: 413 })) : of({ id: file.name }),
      );
      const pick = (...files: File[]) => {
        const input = document.createElement('input');
        input.type = 'file';
        Object.defineProperty(input, 'files', { value: files });
        component.onFileUpload({ target: input } as unknown as Event);
      };

      pick(first, broken, third);
      expect(createFile.mock.calls.map(([, , file]) => file)).toEqual([first, broken, third]);
      expect(error).toHaveBeenCalledExactlyOnceWith('b.png could not be uploaded: the file is too large.');
      expect(component.fileUploadQueue()).toEqual([]);

      pick(later);
      expect(createFile).toHaveBeenLastCalledWith('space-1', undefined, later);
      expect(component.fileUploadQueue()).toEqual([]);
    });

    it('updates the queue with a new array, so the count re-renders', () => {
      const { component, createFile } = setup();
      const pending = new Subject<unknown>();
      createFile.mockReturnValue(pending);
      const before = component.fileUploadQueue();
      const input = document.createElement('input');
      input.type = 'file';
      Object.defineProperty(input, 'files', { value: [new File(['data'], 'a.png')] });

      component.onFileUpload({ target: input } as unknown as Event);
      const queued = component.fileUploadQueue();
      expect(queued).not.toBe(before);
      expect(queued).toHaveLength(1);

      pending.next({ id: 'a' });
      pending.complete();
      expect(component.fileUploadQueue()).not.toBe(queued);
      expect(component.fileUploadQueue()).toEqual([]);
    });
  });

  describe('openUrlPrompt', () => {
    it('does nothing when the prompt is cancelled', () => {
      const { component, error } = setup();
      vi.stubGlobal('prompt', vi.fn().mockReturnValue(null));

      component.openUrlPrompt();

      expect(error).not.toHaveBeenCalled();
      expect(component.fileUploadQueue()).toEqual([]);
    });

    it('shows an error for an empty url', () => {
      const { component, error } = setup();
      vi.stubGlobal('prompt', vi.fn().mockReturnValue(''));

      component.openUrlPrompt();

      expect(error).toHaveBeenCalledWith('URL is empty.');
    });

    it('shows an error for an invalid url', () => {
      const { component, error } = setup();
      vi.stubGlobal('prompt', vi.fn().mockReturnValue('not-a-url'));

      component.openUrlPrompt();

      expect(error).toHaveBeenCalledWith('Not a valid URL.');
    });

    it('queues an import for a valid url, splitting the name and extension', () => {
      const { component, importFile } = setup();
      vi.stubGlobal('prompt', vi.fn().mockReturnValue('https://example.com/path/photo.png'));

      component.openUrlPrompt();

      expect(importFile).toHaveBeenCalledWith('space-1', undefined, {
        url: 'https://example.com/path/photo.png',
        name: 'photo',
        extension: '.png',
        source: 'https://example.com/path/photo.png',
      });
    });
  });

  describe('openAddFolderDialog', () => {
    it('creates the folder and notifies success when confirmed', () => {
      const { component, open, createFolder, success } = setup();
      open.mockReturnValue({ closed$: of({ name: 'Images' }) });

      component.openAddFolderDialog();

      expect(createFolder).toHaveBeenCalledWith('space-1', undefined, { name: 'Images' });
      expect(success).toHaveBeenCalledWith('Folder has been created.');
    });

    it('notifies an error on failure', () => {
      const { component, open, createFolder, error } = setup();
      createFolder.mockReturnValue(throwError(() => new Error('boom')));
      open.mockReturnValue({ closed$: of({ name: 'Images' }) });

      component.openAddFolderDialog();

      expect(error).toHaveBeenCalledWith('Folder can not be created.');
    });
  });

  describe('openEditDialog', () => {
    it('routes files to openEditFileDialog', () => {
      const { component, open, update, success } = setup();
      open.mockReturnValue({ closed$: of({ name: 'renamed' }) });

      component.openEditDialog(file({ id: 'a1' }));

      expect(update).toHaveBeenCalledWith('space-1', 'a1', { name: 'renamed', alt: '' });
      expect(success).toHaveBeenCalledWith('File has been updated.');
    });

    it('routes folders to openEditFolderDialog', () => {
      const { component, open, update, success } = setup();
      open.mockReturnValue({ closed$: of({ name: 'renamed' }) });

      component.openEditDialog(folder({ id: 'f1' }));

      expect(update).toHaveBeenCalledWith('space-1', 'f1', { name: 'renamed' });
      expect(success).toHaveBeenCalledWith('Folder has been updated.');
    });
  });

  describe('openDeleteDialog', () => {
    it('deletes and notifies success when confirmed', () => {
      const { component, open, remove, success } = setup();
      open.mockReturnValue({ closed$: of(true) });

      component.openDeleteDialog(file({ id: 'a1', name: 'photo' }));

      expect(remove).toHaveBeenCalledWith('space-1', 'a1');
      expect(success).toHaveBeenCalledWith("Asset 'photo' has been deleted.");
    });

    const dialogContent = (open: ReturnType<typeof vi.fn>) => (open.mock.calls[0][1] as { context: { content: string } }).context.content;

    it('warns how many contents use the asset before deleting', () => {
      const { component, open, findUsage } = setup();
      findUsage.mockReturnValue(of({ contents: 2 }));
      open.mockReturnValue({ closed$: of(undefined) });

      component.openDeleteDialog(file({ id: 'a1', name: 'photo' }));

      expect(findUsage).toHaveBeenCalledWith('space-1', 'a1');
      expect(dialogContent(open)).toContain('It is used by 2 contents, which will show it as missing.');
    });

    it('says nothing about use when no content uses it, or when the count cannot be loaded', () => {
      const { component, open, findUsage } = setup();
      open.mockReturnValue({ closed$: of(undefined) });
      component.openDeleteDialog(file({ id: 'a1' }));
      expect(dialogContent(open)).not.toContain('used by');

      open.mockClear();
      findUsage.mockReturnValue(throwError(() => new Error('offline')));
      component.openDeleteDialog(file({ id: 'a1' }));
      expect(dialogContent(open)).not.toContain('used by');
    });

    it('does not delete when cancelled', () => {
      const { component, open, remove } = setup();
      open.mockReturnValue({ closed$: of(undefined) });

      component.openDeleteDialog(file({ id: 'a1' }));

      expect(remove).not.toHaveBeenCalled();
    });
  });

  describe('openMoveDialog', () => {
    it('moves and notifies success when confirmed', () => {
      const { component, open, move, success } = setup();
      open.mockReturnValue({ closed$: of({ parentId: 'f1' }) });
      const element = file({ id: 'a1' });

      component.openMoveDialog(element);

      expect(open.mock.calls[0][1].context).toEqual({ spaceId: 'space-1', asset: element });
      expect(move).toHaveBeenCalledWith('space-1', 'a1', 'f1');
      expect(success).toHaveBeenCalledWith('Asset has been moved.');
    });
  });

  describe('onAssetSelect', () => {
    it('navigates into a selected folder', () => {
      const { component, changeAssetFolder } = setup();

      component.onAssetSelect(folder({ id: 'f1', name: 'Images' }));

      expect(changeAssetFolder).toHaveBeenCalledWith('f1');
    });

    it('opens the preview dialog for a previewable file', () => {
      const { component, open } = setup();
      open.mockReturnValue({ closed$: of(undefined) });

      component.onAssetSelect(file({ id: 'a1', type: 'image/png' }));

      expect(open).toHaveBeenCalled();
    });

    it('does nothing for a non-previewable file', () => {
      const { component, open } = setup();

      component.onAssetSelect(file({ id: 'a1', type: 'application/pdf' }));

      expect(open).not.toHaveBeenCalled();
    });
  });

  describe('breadcrumbs', () => {
    it('are built from the folder map, and navigate by folder id', () => {
      const { component, changeAssetFolder } = setup('f2');
      expect(component.trail().map(it => it.name)).toEqual(['Images', '2026']);

      component.navigateToFolder('f1');
      expect(changeAssetFolder).toHaveBeenCalledWith('f1');
      component.navigateToFolder(null);
      expect(changeAssetFolder).toHaveBeenLastCalledWith(null);
    });
  });

  describe('fileIcon / filePreview', () => {
    it('returns the audio icon for audio types', () => {
      const { component } = setup();
      expect(component.fileIcon('audio/mpeg')).toBeTruthy();
    });

    it('returns the fallback icon for unrecognized types', () => {
      const { component } = setup();
      expect(component.fileIcon('application/octet-stream')).toBeTruthy();
    });

    it('previews images and videos only', () => {
      const { component } = setup();
      expect(component.filePreview('image/png')).toBe(true);
      expect(component.filePreview('video/mp4')).toBe(true);
      expect(component.filePreview('application/pdf')).toBe(false);
    });
  });

  describe('onDownload', () => {
    it('opens the download url for a file', () => {
      const { component } = setup();
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

      component.onDownload(file({ id: 'a1' }));

      expect(openSpy).toHaveBeenCalledWith('/api/v1/spaces/space-1/assets/a1/download');
      openSpy.mockRestore();
    });

    it('does nothing for a folder', () => {
      const { component } = setup();
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

      component.onDownload(folder({ id: 'f1' }));

      expect(openSpy).not.toHaveBeenCalled();
      openSpy.mockRestore();
    });
  });

  describe('task dialogs', () => {
    it('openImportDialog() creates an import task and notifies success', () => {
      const { component, open, createAssetImportTask, success } = setup();
      const uploadedFile = new File(['data'], 'assets.zip');
      open.mockReturnValue({ closed$: of({ file: uploadedFile }) });

      component.openImportDialog();

      expect(createAssetImportTask).toHaveBeenCalledWith('space-1', uploadedFile);
      expect(success).toHaveBeenCalledWith('Assets Import Task has been created.', expect.anything());
    });

    it('openExportDialog() creates an export task and notifies success', () => {
      const { component, open, createAssetExportTask, success } = setup();
      open.mockReturnValue({ closed$: of({ path: 'images' }) });

      component.openExportDialog();

      expect(createAssetExportTask).toHaveBeenCalledWith('space-1', 'images');
      expect(success).toHaveBeenCalledWith('Assets Export Task has been created.', expect.anything());
    });

    it('openRegenerateMetadataDialog() creates the task when confirmed', () => {
      const { component, open, createAssetRegenerateMetadataTask, success } = setup();
      open.mockReturnValue({ closed$: of(true) });

      component.openRegenerateMetadataDialog();

      expect(createAssetRegenerateMetadataTask).toHaveBeenCalledWith('space-1');
      expect(success).toHaveBeenCalledWith('Assets Regenerate Metadata Task has been created.', expect.anything());
    });
  });

  describe('onPaste', () => {
    function clipboardEvent(items: Array<{ kind: string; file: File | null }>): ClipboardEvent {
      return {
        clipboardData: {
          items: items.map(it => ({ kind: it.kind, getAsFile: () => it.file })),
        },
        preventDefault: vi.fn(),
      } as unknown as ClipboardEvent;
    }

    it('uploads pasted files and prevents the default paste action', () => {
      const { component, createFile } = setup();
      const pastedFile = new File(['data'], 'clip.png', { type: 'image/png' });
      const event = clipboardEvent([{ kind: 'file', file: pastedFile }]);

      component.onPaste(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(createFile).toHaveBeenCalledWith('space-1', undefined, pastedFile);
    });

    it('generates a filename for a nameless pasted screenshot', () => {
      const { component, createFile } = setup();
      const pastedFile = new File(['data'], '', { type: 'image/png' });
      const event = clipboardEvent([{ kind: 'file', file: pastedFile }]);

      component.onPaste(event);

      const [, , namedFile] = createFile.mock.calls[0];
      expect(namedFile.name).toMatch(/^paste-\d+\.png$/);
    });

    it('ignores non-file clipboard items and does nothing when there are no files', () => {
      const { component, createFile } = setup();
      const event = clipboardEvent([{ kind: 'string', file: null }]);

      component.onPaste(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(createFile).not.toHaveBeenCalled();
    });

    it('does nothing when there is no clipboard data', () => {
      const { component, createFile } = setup();

      component.onPaste({ clipboardData: null } as unknown as ClipboardEvent);

      expect(createFile).not.toHaveBeenCalled();
    });
  });
});
