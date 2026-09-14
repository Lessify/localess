import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { AssetFile, AssetFolder, AssetKind } from '@shared/models/asset.model';
import { AssetService } from '@shared/services/asset.service';
import { NotificationService } from '@shared/services/notification.service';
import { TaskService } from '@shared/services/task.service';
import { UnsplashPluginService } from '@shared/services/unsplash-plugin.service';
import { PathItem, SpaceStore } from '@shared/stores/space.store';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { AssetsComponent } from './assets.component';

function file(overrides: Partial<AssetFile> = {}): AssetFile {
  return { id: 'a1', kind: AssetKind.FILE, name: 'photo', type: 'image/png', size: 10, parentPath: '', ...overrides } as AssetFile;
}

function folder(overrides: Partial<AssetFolder> = {}): AssetFolder {
  return { id: 'f1', kind: AssetKind.FOLDER, name: 'Images', parentPath: '', ...overrides } as AssetFolder;
}

describe('AssetsComponent', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  function setup(assetPath: PathItem[] = []) {
    const findAll = vi.fn().mockReturnValue(of([]));
    const createFile = vi.fn().mockReturnValue(of({ id: 'new-file' }));
    const importFile = vi.fn().mockReturnValue(of({ id: 'new-file' }));
    const createFolder = vi.fn().mockReturnValue(of(undefined));
    const updateFolder = vi.fn().mockReturnValue(of(undefined));
    const updateFile = vi.fn().mockReturnValue(of(undefined));
    const deleteAsset = vi.fn().mockReturnValue(of(undefined));
    const move = vi.fn().mockReturnValue(of(undefined));
    const createAssetImportTask = vi.fn().mockReturnValue(of({ id: 't1' }));
    const createAssetExportTask = vi.fn().mockReturnValue(of({ id: 't1' }));
    const createAssetRegenerateMetadataTask = vi.fn().mockReturnValue(of({ id: 't1' }));
    const success = vi.fn();
    const error = vi.fn();
    const open = vi.fn();
    const changeAssetPath = vi.fn();

    TestBed.overrideComponent(AssetsComponent, { set: { template: '<ll-paginator [length]="0" />' } });
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AssetService,
          useValue: { findAll, createFile, importFile, createFolder, updateFolder, updateFile, delete: deleteAsset, move },
        },
        { provide: TaskService, useValue: { createAssetImportTask, createAssetExportTask, createAssetRegenerateMetadataTask } },
        { provide: NotificationService, useValue: { success, error } },
        { provide: MatDialog, useValue: { open } },
        { provide: UnsplashPluginService, useValue: { enabled: () => false } },
        { provide: SpaceStore, useValue: { assetPath: signal(assetPath), changeAssetPath } },
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
      updateFolder,
      updateFile,
      deleteAsset,
      move,
      createAssetImportTask,
      createAssetExportTask,
      createAssetRegenerateMetadataTask,
      success,
      error,
      open,
      changeAssetPath,
    };
  }

  it('loads root assets on init', () => {
    const { component, findAll } = setup();

    expect(findAll).toHaveBeenCalledWith('space-1', '');
    expect(component.isLoading()).toBe(false);
  });

  it('loads assets under the current folder path', () => {
    const { findAll } = setup([{ name: 'Images', fullSlug: 'images' }]);

    expect(findAll).toHaveBeenCalledWith('space-1', 'images');
  });

  describe('onFileUpload', () => {
    it('queues and uploads a selected file', () => {
      const { component, createFile } = setup();
      const input = document.createElement('input');
      input.type = 'file';
      const uploadedFile = new File(['data'], 'photo.png');
      Object.defineProperty(input, 'files', { value: [uploadedFile] });

      component.onFileUpload({ target: input } as unknown as Event);

      expect(createFile).toHaveBeenCalledWith('space-1', '', uploadedFile);
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

      expect(importFile).toHaveBeenCalledWith('space-1', '', {
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
      open.mockReturnValue({ afterClosed: () => of({ name: 'Images' }) });

      component.openAddFolderDialog();

      expect(createFolder).toHaveBeenCalledWith('space-1', '', { name: 'Images' });
      expect(success).toHaveBeenCalledWith('Folder has been created.');
    });

    it('notifies an error on failure', () => {
      const { component, open, createFolder, error } = setup();
      createFolder.mockReturnValue(throwError(() => new Error('boom')));
      open.mockReturnValue({ afterClosed: () => of({ name: 'Images' }) });

      component.openAddFolderDialog();

      expect(error).toHaveBeenCalledWith('Folder can not be created.');
    });
  });

  describe('openEditDialog', () => {
    it('routes files to openEditFileDialog', () => {
      const { component, open, updateFile, success } = setup();
      open.mockReturnValue({ afterClosed: () => of({ name: 'renamed' }) });

      component.openEditDialog(file({ id: 'a1' }));

      expect(updateFile).toHaveBeenCalledWith('space-1', 'a1', { name: 'renamed' });
      expect(success).toHaveBeenCalledWith('File has been updated.');
    });

    it('routes folders to openEditFolderDialog', () => {
      const { component, open, updateFolder, success } = setup();
      open.mockReturnValue({ afterClosed: () => of({ name: 'renamed' }) });

      component.openEditDialog(folder({ id: 'f1' }));

      expect(updateFolder).toHaveBeenCalledWith('space-1', 'f1', { name: 'renamed' });
      expect(success).toHaveBeenCalledWith('Folder has been updated.');
    });
  });

  describe('openDeleteDialog', () => {
    it('deletes and notifies success when confirmed', () => {
      const { component, open, deleteAsset, success } = setup();
      open.mockReturnValue({ afterClosed: () => of(true) });

      component.openDeleteDialog(file({ id: 'a1', name: 'photo' }));

      expect(deleteAsset).toHaveBeenCalledWith('space-1', 'a1');
      expect(success).toHaveBeenCalledWith("Asset 'photo' has been deleted.");
    });

    it('does not delete when cancelled', () => {
      const { component, open, deleteAsset } = setup();
      open.mockReturnValue({ afterClosed: () => of(false) });

      component.openDeleteDialog(file({ id: 'a1' }));

      expect(deleteAsset).not.toHaveBeenCalled();
    });
  });

  describe('openMoveDialog', () => {
    it('moves and notifies success when confirmed', () => {
      const { component, open, move, success } = setup();
      open.mockReturnValue({ afterClosed: () => of({ path: 'images' }) });

      component.openMoveDialog(file({ id: 'a1' }));

      expect(move).toHaveBeenCalledWith('space-1', 'a1', 'images');
      expect(success).toHaveBeenCalledWith('Asset has been moved.');
    });
  });

  describe('onAssetSelect', () => {
    it('navigates into a selected folder', () => {
      const { component, changeAssetPath } = setup();

      component.onAssetSelect(folder({ id: 'f1', name: 'Images', parentPath: '' }));

      expect(component.isLoading()).toBe(true);
      expect(changeAssetPath).toHaveBeenCalledWith([{ name: 'Images', fullSlug: 'f1' }]);
    });

    it('opens the preview dialog for a previewable file', () => {
      const { component, open } = setup();
      open.mockReturnValue({ afterClosed: () => of(undefined) });

      component.onAssetSelect(file({ id: 'a1', type: 'image/png' }));

      expect(open).toHaveBeenCalled();
    });

    it('does nothing for a non-previewable file', () => {
      const { component, open } = setup();

      component.onAssetSelect(file({ id: 'a1', type: 'application/pdf' }));

      expect(open).not.toHaveBeenCalled();
    });
  });

  describe('navigateToSlug', () => {
    it('truncates the path after the target segment', () => {
      const path: PathItem[] = [
        { name: 'A', fullSlug: 'a' },
        { name: 'B', fullSlug: 'a/b' },
        { name: 'C', fullSlug: 'a/b/c' },
      ];
      const { component, changeAssetPath } = setup(path);

      component.navigateToSlug(path[1]);

      expect(changeAssetPath).toHaveBeenCalledWith([path[0], path[1]]);
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
      open.mockReturnValue({ afterClosed: () => of({ file: uploadedFile }) });

      component.openImportDialog();

      expect(createAssetImportTask).toHaveBeenCalledWith('space-1', uploadedFile);
      expect(success).toHaveBeenCalledWith('Assets Import Task has been created.', expect.anything());
    });

    it('openExportDialog() creates an export task and notifies success', () => {
      const { component, open, createAssetExportTask, success } = setup();
      open.mockReturnValue({ afterClosed: () => of({ path: 'images' }) });

      component.openExportDialog();

      expect(createAssetExportTask).toHaveBeenCalledWith('space-1', 'images');
      expect(success).toHaveBeenCalledWith('Assets Export Task has been created.', expect.anything());
    });

    it('openRegenerateMetadataDialog() creates the task when confirmed', () => {
      const { component, open, createAssetRegenerateMetadataTask, success } = setup();
      open.mockReturnValue({ afterClosed: () => of(true) });

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
      expect(createFile).toHaveBeenCalledWith('space-1', '', pastedFile);
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
