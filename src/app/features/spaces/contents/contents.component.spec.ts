import { TestBed } from '@angular/core/testing';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { Router } from '@angular/router';
import { Content, ContentDocument, ContentFolder, ContentKind } from '@shared/models/content.model';
import { Schema, SchemaType } from '@shared/models/schema.model';
import { Token, TokenPermission } from '@shared/models/token.model';
import { ContentService } from '@shared/services/content.service';
import { NotificationService } from '@shared/services/notification.service';
import { SchemaService } from '@shared/services/schema.service';
import { TaskService } from '@shared/services/task.service';
import { TokenService } from '@shared/services/token.service';
import { PathItem, SpaceStore } from '@shared/stores/space.store';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { ContentsComponent } from './contents.component';

function doc(overrides: Partial<ContentDocument> = {}): ContentDocument {
  return { id: 'c1', kind: ContentKind.DOCUMENT, name: 'Page', slug: 'page', schema: 's1', ...overrides } as unknown as ContentDocument;
}

function folder(overrides: Partial<ContentFolder> = {}): ContentFolder {
  return { id: 'f1', kind: ContentKind.FOLDER, name: 'Folder', slug: 'folder', fullSlug: 'folder', ...overrides } as unknown as ContentFolder;
}

describe('ContentsComponent', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  function setup(contents: Content[] = [], schemas: Schema[] = [{ id: 's1', type: SchemaType.ROOT } as Schema]) {
    const findAllSchemas = vi.fn().mockReturnValue(of(schemas));
    const findAllContents = vi.fn().mockReturnValue(of(contents));
    const createDocument = vi.fn().mockReturnValue(of(undefined));
    const createFolder = vi.fn().mockReturnValue(of(undefined));
    const update = vi.fn().mockReturnValue(of(undefined));
    const deleteContent = vi.fn().mockReturnValue(of(undefined));
    const move = vi.fn().mockReturnValue(of(undefined));
    const cloneDocument = vi.fn().mockReturnValue(of(undefined));
    const publish = vi.fn().mockReturnValue(of(undefined));
    const unpublish = vi.fn().mockReturnValue(of(undefined));
    const createContentImportTask = vi.fn().mockReturnValue(of({ id: 't1' }));
    const createContentExportTask = vi.fn().mockReturnValue(of({ id: 't1' }));
    const findFirstByPermission = vi.fn().mockReturnValue(of([{ id: 'token1' } as Token]));
    const navigate = vi.fn();
    const success = vi.fn();
    const error = vi.fn();
    const open = vi.fn();
    const changeContentPath = vi.fn();

    TestBed.overrideComponent(ContentsComponent, {
      set: { template: '<table llTableSort></table><ll-paginator [length]="0" />' },
    });
    TestBed.configureTestingModule({
      providers: [
        { provide: SchemaService, useValue: { findAll: findAllSchemas } },
        {
          provide: ContentService,
          useValue: {
            findAll: findAllContents,
            createDocument,
            createFolder,
            update,
            delete: deleteContent,
            move,
            cloneDocument,
            publish,
            unpublish,
          },
        },
        { provide: TaskService, useValue: { createContentImportTask, createContentExportTask } },
        { provide: TokenService, useValue: { findFirstByPermission } },
        { provide: NotificationService, useValue: { success, error } },
        { provide: HlmDialogService, useValue: { open } },
        { provide: Router, useValue: { navigate } },
        { provide: SpaceStore, useValue: { contentPath: signal([]), changeContentPath } },
      ],
    });
    const fixture = TestBed.createComponent(ContentsComponent);
    fixture.componentRef.setInput('spaceId', 'space-1');
    fixture.detectChanges();
    return {
      component: fixture.componentInstance,
      findAllSchemas,
      findAllContents,
      createDocument,
      createFolder,
      update,
      deleteContent,
      move,
      cloneDocument,
      publish,
      unpublish,
      createContentImportTask,
      createContentExportTask,
      findFirstByPermission,
      navigate,
      success,
      error,
      open,
      changeContentPath,
    };
  }

  it('loads schemas and sorted contents on init', () => {
    const b = doc({ id: 'b', name: 'B' });
    const a = doc({ id: 'a', name: 'A' });
    const { component, findAllSchemas, findAllContents } = setup([b, a]);

    expect(findAllSchemas).toHaveBeenCalledWith('space-1', SchemaType.ROOT);
    expect(findAllContents).toHaveBeenCalledWith('space-1', '');
    expect(component.dataSource.filteredData().map(c => c.id)).toEqual(['a', 'b']);
    expect(component.isLoading()).toBe(false);
  });

  describe('openAddDocumentDialog', () => {
    it('creates the document and notifies success when confirmed', () => {
      const { component, open, createDocument, success } = setup([doc({ id: 'c1', name: 'Page', slug: 'page' })]);
      const model = { name: 'New', slug: 'new', schema: 's1' };
      open.mockReturnValue({ closed$: of(model) });

      component.openAddDocumentDialog();

      expect(open).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ context: expect.objectContaining({ reservedNames: ['Page'], reservedSlugs: ['page'] }) }),
      );
      expect(createDocument).toHaveBeenCalledWith('space-1', '', model);
      expect(success).toHaveBeenCalledWith('Document has been created.');
    });

    it('notifies an error on failure', () => {
      const { component, open, createDocument, error } = setup();
      createDocument.mockReturnValue(throwError(() => new Error('boom')));
      open.mockReturnValue({ closed$: of({ name: 'New', slug: 'new', schema: 's1' }) });

      component.openAddDocumentDialog();

      expect(error).toHaveBeenCalledWith('Document can not be created.');
    });
  });

  describe('openAddFolderDialog', () => {
    it('creates the folder and notifies success when confirmed', () => {
      const { component, open, createFolder, success } = setup();
      open.mockReturnValue({ closed$: of({ name: 'New', slug: 'new' }) });

      component.openAddFolderDialog();

      expect(createFolder).toHaveBeenCalledWith('space-1', '', { name: 'New', slug: 'new' });
      expect(success).toHaveBeenCalledWith('Folder has been created.');
    });

    it('notifies an error on failure', () => {
      const { component, open, createFolder, error } = setup();
      createFolder.mockReturnValue(throwError(() => new Error('boom')));
      open.mockReturnValue({ closed$: of({ name: 'New', slug: 'new' }) });

      component.openAddFolderDialog();

      expect(error).toHaveBeenCalledWith('Folder can not be created.');
    });
  });

  describe('openEditDialog', () => {
    it('updates the content and notifies success when confirmed', () => {
      const { component, open, update, success } = setup();
      open.mockReturnValue({ closed$: of({ name: 'Renamed', slug: 'renamed' }) });

      component.openEditDialog(doc({ id: 'c1' }));

      expect(update).toHaveBeenCalledWith('space-1', 'c1', '', { name: 'Renamed', slug: 'renamed' });
      expect(success).toHaveBeenCalledWith('Content has been updated.');
    });

    it('notifies an error on failure', () => {
      const { component, open, update, error } = setup();
      update.mockReturnValue(throwError(() => new Error('boom')));
      open.mockReturnValue({ closed$: of({ name: 'Renamed', slug: 'renamed' }) });

      component.openEditDialog(doc({ id: 'c1' }));

      expect(error).toHaveBeenCalledWith('Content can not be updated.');
    });
  });

  describe('openDeleteDialog', () => {
    it('deletes a folder with folder-specific messaging when confirmed', () => {
      const { component, open, deleteContent, success } = setup();
      open.mockReturnValue({ closed$: of(true) });
      const element = folder({ name: 'Folder' });

      component.openDeleteDialog(element);

      expect(open).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ context: expect.objectContaining({ title: 'Delete Folder' }) }),
      );
      expect(deleteContent).toHaveBeenCalledWith('space-1', element);
      expect(success).toHaveBeenCalledWith("Folder 'Folder' has been deleted.");
    });

    it('deletes a document with document-specific messaging when confirmed', () => {
      const { component, open, deleteContent, success } = setup();
      open.mockReturnValue({ closed$: of(true) });
      const element = doc({ name: 'Page' });

      component.openDeleteDialog(element);

      expect(deleteContent).toHaveBeenCalledWith('space-1', element);
      expect(success).toHaveBeenCalledWith("Document 'Page' has been deleted.");
    });

    it('does not delete when cancelled', () => {
      const { component, open, deleteContent } = setup();
      open.mockReturnValue({ closed$: of(undefined) });

      component.openDeleteDialog(doc());

      expect(deleteContent).not.toHaveBeenCalled();
    });
  });

  describe('openMoveDialog', () => {
    it('moves and notifies success when confirmed', () => {
      const { component, open, move, success } = setup();
      open.mockReturnValue({ closed$: of({ path: 'new-parent' }) });
      const element = doc({ id: 'c1', slug: 'page' });

      component.openMoveDialog(element);

      expect(move).toHaveBeenCalledWith('space-1', 'c1', 'new-parent', 'page');
      expect(success).toHaveBeenCalledWith('Document has been moved.');
    });
  });

  describe('openCloneDialog', () => {
    it('clones and notifies success when confirmed', () => {
      const { component, open, cloneDocument, success } = setup();
      open.mockReturnValue({ closed$: of(true) });
      const element = doc({ name: 'Page' });

      component.openCloneDialog(element);

      expect(cloneDocument).toHaveBeenCalledWith('space-1', element);
      expect(success).toHaveBeenCalledWith("Document 'Page' has been cloned.");
    });
  });

  describe('openPublishDialog / openUnpublishDialog', () => {
    it('publishes a document with document-specific messaging', () => {
      const { component, open, publish, success } = setup();
      open.mockReturnValue({ closed$: of(true) });
      const element = doc({ id: 'c1', name: 'Page' });

      component.openPublishDialog(element);

      expect(publish).toHaveBeenCalledWith('space-1', 'c1');
      expect(success).toHaveBeenCalledWith("Document 'Page' has been published.");
    });

    it('publishes a folder with folder-specific messaging', () => {
      const { component, open, publish, success } = setup();
      open.mockReturnValue({ closed$: of(true) });
      const element = folder({ id: 'f1', name: 'Folder' });

      component.openPublishDialog(element);

      expect(publish).toHaveBeenCalledWith('space-1', 'f1');
      expect(success).toHaveBeenCalledWith("Folder 'Folder' has been published.");
    });

    it('unpublishes with success messaging', () => {
      const { component, open, unpublish, success } = setup();
      open.mockReturnValue({ closed$: of(true) });
      const element = doc({ id: 'c1', name: 'Page' });

      component.openUnpublishDialog(element);

      expect(unpublish).toHaveBeenCalledWith('space-1', 'c1');
      expect(success).toHaveBeenCalledWith("Document 'Page' has been unpublished.");
    });
  });

  describe('onRowSelect', () => {
    it('navigates to the document editor when its schema is known', () => {
      const { component, navigate } = setup([], [{ id: 's1', type: SchemaType.ROOT } as Schema]);

      component.onRowSelect(doc({ id: 'c1', schema: 's1' }));

      expect(navigate).toHaveBeenCalledWith(['features', 'spaces', 'space-1', 'contents', 'c1']);
    });

    it('notifies an error when the schema can not be found', () => {
      const { component, navigate, error } = setup([], []);

      component.onRowSelect(doc({ id: 'c1', schema: 'missing' }));

      expect(navigate).not.toHaveBeenCalled();
      expect(error).toHaveBeenCalledWith('Content Schema can not be found.');
    });

    it('navigates into a selected folder', () => {
      const { component, changeContentPath } = setup();

      component.onRowSelect(folder({ id: 'f1', name: 'Folder', fullSlug: 'folder' }));

      expect(component.isLoading()).toBe(true);
      expect(changeContentPath).toHaveBeenCalledWith([{ name: 'Folder', fullSlug: 'folder' }]);
    });
  });

  it('navigateToSlug() truncates the path after the target segment', () => {
    const { component, changeContentPath } = setup();

    component.navigateToSlug({ name: 'A', fullSlug: 'a' });

    expect(changeContentPath).toHaveBeenCalledWith([]);
  });

  describe('openLinksV1InNewTab', () => {
    it('fetches a token then opens the link', () => {
      const { component, findFirstByPermission } = setup();
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

      component.openLinksV1InNewTab();

      expect(findFirstByPermission).toHaveBeenCalledWith('space-1', TokenPermission.CONTENT_PUBLIC);
      expect(openSpy).toHaveBeenCalled();
      openSpy.mockRestore();
    });

    it('reuses the cached token on a second call', () => {
      const { component, findFirstByPermission } = setup();
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
      component.openLinksV1InNewTab();
      findFirstByPermission.mockClear();

      component.openLinksV1InNewTab();

      expect(findFirstByPermission).not.toHaveBeenCalled();
      openSpy.mockRestore();
    });

    it('notifies an error when no single token is available', () => {
      const { component, findFirstByPermission, error } = setup();
      findFirstByPermission.mockReturnValue(of([]));

      component.openLinksV1InNewTab();

      expect(error).toHaveBeenCalledWith('Please create Access Token with Content Public Permission in your Space Settings');
    });
  });

  describe('openImportDialog / openExportDialog', () => {
    it('creates an import task and notifies success', () => {
      const { component, open, createContentImportTask, success } = setup();
      const file = new File(['data'], 'contents.zip');
      open.mockReturnValue({ closed$: of({ file }) });

      component.openImportDialog();

      expect(createContentImportTask).toHaveBeenCalledWith('space-1', file);
      expect(success).toHaveBeenCalledWith('Content Import Task has been created.', expect.anything());
    });

    it('creates an export task and notifies success', () => {
      const { component, open, createContentExportTask, success } = setup();
      open.mockReturnValue({ closed$: of({ path: 'c1' }) });

      component.openExportDialog();

      expect(createContentExportTask).toHaveBeenCalledWith('space-1', 'c1');
      expect(success).toHaveBeenCalledWith('Content Export Task has been created.', expect.anything());
    });
  });

  it('copiedSlug()/copiedFullSlug() notify success', () => {
    const { component, success } = setup();

    component.copiedSlug();
    component.copiedFullSlug();

    expect(success).toHaveBeenNthCalledWith(1, 'Slug copied to clipboard.');
    expect(success).toHaveBeenNthCalledWith(2, 'Full Slug copied to clipboard.');
  });
});
