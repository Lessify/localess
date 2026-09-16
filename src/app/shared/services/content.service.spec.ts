import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

// @angular/fire/firestore and @angular/fire/functions are mocked globally in src/test-setup.ts.
import { Auth } from '@angular/fire/auth';
import {
  addDoc,
  collectionCount,
  collectionData,
  deleteDoc,
  docData,
  Firestore,
  updateDoc,
} from '@angular/fire/firestore';
import { Functions, httpsCallableData } from '@angular/fire/functions';
import { firstValueFrom, of } from 'rxjs';

import {
  Content,
  ContentData,
  ContentDocument,
  ContentDocumentCreate,
  ContentFolderCreate,
  ContentKind,
  ContentUpdate,
} from '../models/content.model';
import { ContentService } from './content.service';

describe('ContentService', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  function setup(currentUser: unknown = null) {
    vi.mocked(httpsCallableData).mockReturnValue(vi.fn().mockReturnValue(of(undefined)));
    TestBed.configureTestingModule({
      providers: [
        { provide: Firestore, useValue: {} },
        { provide: Functions, useValue: {} },
        { provide: Auth, useValue: { currentUser } },
      ],
    });
    return TestBed.inject(ContentService);
  }

  it('findAll() reads the space contents collection filtered by parentSlug', async () => {
    const service = setup();
    const contents: Content[] = [{ id: 'c1' } as unknown as Content];
    vi.mocked(collectionData).mockReturnValue(of(contents));

    const result = await firstValueFrom(service.findAll('space-1', 'parent'));

    expect(result).toEqual(contents);
    expect(collectionData).toHaveBeenCalledWith(
      {
        ref: { path: 'mock-collection-ref' },
        constraints: [
          { type: 'orderBy', field: 'kind', direction: 'desc' },
          { type: 'orderBy', field: 'name', direction: 'asc' },
          { type: 'where', field: 'parentSlug', op: '==', value: 'parent' },
        ],
      },
      { idField: 'id' },
    );
  });

  it('findAll() filters root content by an empty parentSlug when none given', async () => {
    const service = setup();
    vi.mocked(collectionData).mockReturnValue(of([]));

    await firstValueFrom(service.findAll('space-1'));

    const [queryArg] = vi.mocked(collectionData).mock.calls[0];
    expect(queryArg).toMatchObject({ constraints: expect.arrayContaining([{ type: 'where', field: 'parentSlug', op: '==', value: '' }]) });
  });

  it('countAll() counts the space contents collection', async () => {
    const service = setup();
    vi.mocked(collectionCount).mockReturnValue(of(7) as never);

    const result = await firstValueFrom(service.countAll('space-1'));

    expect(result).toBe(7);
  });

  it('findById() reads the content doc at the expected path', async () => {
    const service = setup();
    const content: Content = { id: 'c1' } as unknown as Content;
    vi.mocked(docData).mockReturnValue(of(content));

    const result = await firstValueFrom(service.findById('space-1', 'c1'));

    expect(result).toEqual(content);
  });

  it('createDocument() adds a document with a composed fullSlug and no updatedBy when the user has no profile', async () => {
    const service = setup();
    vi.mocked(addDoc).mockResolvedValue({ id: 'new-doc' } as never);
    const entity: ContentDocumentCreate = { name: 'Doc', slug: 'doc', schema: 'root' };

    await firstValueFrom(service.createDocument('space-1', 'parent', entity));

    const [, addedEntity] = vi.mocked(addDoc).mock.calls[0];
    expect(addedEntity).toMatchObject({
      kind: ContentKind.DOCUMENT,
      name: 'Doc',
      slug: 'doc',
      parentSlug: 'parent',
      fullSlug: 'parent/doc',
      schema: 'root',
    });
    expect(addedEntity).not.toHaveProperty('updatedBy');
  });

  it('createDocument() sets updatedBy from the current user and a bare fullSlug at the root', async () => {
    const service = setup({ email: 'a@b.com', displayName: 'Alex' });
    vi.mocked(addDoc).mockResolvedValue({ id: 'new-doc' } as never);
    const entity: ContentDocumentCreate = { name: 'Doc', slug: 'doc', schema: 'root' };

    await firstValueFrom(service.createDocument('space-1', '', entity));

    const [, addedEntity] = vi.mocked(addDoc).mock.calls[0];
    expect(addedEntity).toMatchObject({ fullSlug: 'doc', updatedBy: { name: 'Alex', email: 'a@b.com' } });
  });

  it('createFolder() adds a folder with a composed fullSlug', async () => {
    const service = setup();
    vi.mocked(addDoc).mockResolvedValue({ id: 'new-folder' } as never);
    const entity: ContentFolderCreate = { name: 'Folder', slug: 'folder' };

    await firstValueFrom(service.createFolder('space-1', 'parent', entity));

    const [, addedEntity] = vi.mocked(addDoc).mock.calls[0];
    expect(addedEntity).toMatchObject({ kind: ContentKind.FOLDER, name: 'Folder', slug: 'folder', fullSlug: 'parent/folder' });
  });

  it('update() sets the new slug info', async () => {
    const service = setup();
    const entity: ContentUpdate = { name: 'Renamed', slug: 'renamed' };

    await firstValueFrom(service.update('space-1', 'c1', 'parent', entity));

    const [, updatedFields] = vi.mocked(updateDoc).mock.calls[0];
    expect(updatedFields).toMatchObject({ name: 'Renamed', slug: 'renamed', parentSlug: 'parent', fullSlug: 'parent/renamed' });
  });

  it('move() clears parentSlug when moved to the root sentinel "~"', async () => {
    const service = setup();

    await firstValueFrom(service.move('space-1', 'c1', '~', 'doc'));

    const [, updatedFields] = vi.mocked(updateDoc).mock.calls[0];
    expect(updatedFields).toMatchObject({ parentSlug: '', fullSlug: 'doc' });
  });

  it('move() composes fullSlug under a real parentSlug', async () => {
    const service = setup();

    await firstValueFrom(service.move('space-1', 'c1', 'parent', 'doc'));

    const [, updatedFields] = vi.mocked(updateDoc).mock.calls[0];
    expect(updatedFields).toMatchObject({ parentSlug: 'parent', fullSlug: 'parent/doc' });
  });

  it('updateDocumentData() serializes the data and converts the reference sets to arrays', async () => {
    const service = setup();

    const data: ContentData = { _id: 'c1', schema: 'root', key: 'value' };
    await firstValueFrom(service.updateDocumentData('space-1', 'c1', data, [new Set(['a1']), new Set(['l1']), new Set(['r1'])]));

    const [, updatedFields] = vi.mocked(updateDoc).mock.calls[0];
    expect(updatedFields).toMatchObject({
      data: JSON.stringify({ ...data, _schema: 'root' }),
      assets: ['a1'],
      links: ['l1'],
      references: ['r1'],
    });
  });

  it('cloneDocument() clones name/slug with a random suffix', async () => {
    const service = setup();
    vi.mocked(addDoc).mockResolvedValue({ id: 'cloned-doc' } as never);
    const entity: ContentDocument = {
      id: 'c1',
      kind: ContentKind.DOCUMENT,
      name: 'Doc',
      slug: 'doc',
      parentSlug: 'parent',
      fullSlug: 'parent/doc',
      schema: 'root',
    } as unknown as ContentDocument;

    await firstValueFrom(service.cloneDocument('space-1', entity));

    const [, addedEntity] = vi.mocked(addDoc).mock.calls[0] as [unknown, { name: string; slug: string; fullSlug: string }];
    expect(addedEntity.name).toMatch(/^Doc /);
    expect(addedEntity.slug).toMatch(/^doc-/);
    expect(addedEntity.fullSlug).toMatch(/^parent\/doc-/);
  });

  it('delete() deletes the content doc for the given element', async () => {
    const service = setup();
    const element: Content = { id: 'c1' } as unknown as Content;

    await firstValueFrom(service.delete('space-1', element));

    expect(deleteDoc).toHaveBeenCalledWith({ path: 'mock-doc-ref' });
  });

  it('publish() calls the content-publish callable with spaceId/contentId', async () => {
    const service = setup();

    await firstValueFrom(service.publish('space-1', 'c1'));

    expect(httpsCallableData).toHaveBeenCalledWith(expect.anything(), 'content-publish');
  });

  it('unpublish() calls the content-unpublish callable', async () => {
    const service = setup();

    await firstValueFrom(service.unpublish('space-1', 'c1'));

    expect(httpsCallableData).toHaveBeenCalledWith(expect.anything(), 'content-unpublish');
  });

});
