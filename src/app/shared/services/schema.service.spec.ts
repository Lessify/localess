import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

// @angular/fire/firestore is mocked globally in src/test-setup.ts.
import { collectionCount, collectionData, deleteDoc, deleteField, doc, docData, Firestore, setDoc, updateDoc } from '@angular/fire/firestore';
import { firstValueFrom, of } from 'rxjs';

import {
  Schema,
  SchemaComponentUpdate,
  SchemaCreate,
  SchemaEnum,
  SchemaEnumUpdate,
  SchemaType,
} from '../models/schema.model';
import { SchemaService } from './schema.service';

describe('SchemaService', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  function setup() {
    TestBed.configureTestingModule({ providers: [{ provide: Firestore, useValue: {} }] });
    return TestBed.inject(SchemaService);
  }

  it('findAll() reads the space schemas collection without a type filter', async () => {
    const service = setup();
    const schemas: Schema[] = [{ id: 's1' } as unknown as Schema];
    vi.mocked(collectionData).mockReturnValue(of(schemas));

    const result = await firstValueFrom(service.findAll('space-1'));

    expect(result).toEqual(schemas);
    expect(collectionData).toHaveBeenCalledWith({ ref: { path: 'mock-collection-ref' }, constraints: [] }, { idField: 'id' });
  });

  it('findAll() filters by type when given', async () => {
    const service = setup();
    vi.mocked(collectionData).mockReturnValue(of([]));

    await firstValueFrom(service.findAll('space-1', SchemaType.ROOT));

    expect(collectionData).toHaveBeenCalledWith(
      { ref: { path: 'mock-collection-ref' }, constraints: [{ type: 'where', field: 'type', op: '==', value: SchemaType.ROOT }] },
      { idField: 'id' },
    );
  });

  it('countAll() counts the space schemas collection', async () => {
    const service = setup();
    vi.mocked(collectionCount).mockReturnValue(of(3) as never);

    const result = await firstValueFrom(service.countAll('space-1'));

    expect(result).toBe(3);
  });

  it('findById() reads the schema doc at the expected path', async () => {
    const service = setup();
    const schema: Schema = { id: 's1' } as unknown as Schema;
    vi.mocked(docData).mockReturnValue(of(schema));

    const result = await firstValueFrom(service.findById('space-1', 's1'));

    expect(result).toEqual(schema);
  });

  it('create() sets the doc at the entity id', async () => {
    const service = setup();
    const entity: SchemaCreate = { id: 's1', type: SchemaType.ROOT, displayName: 'Root' } as unknown as SchemaCreate;

    await firstValueFrom(service.create('space-1', entity));

    expect(doc).toHaveBeenCalledWith({}, 'spaces/space-1/schemas/s1');
    const [, addedEntity] = vi.mocked(setDoc).mock.calls[0];
    expect(addedEntity).toMatchObject({ displayName: 'Root', type: SchemaType.ROOT });
  });

  it('updateId() sets the doc under the new id with component fields for ROOT/NODE types then deletes the old doc', async () => {
    const service = setup();
    const entity: Schema = {
      id: 's1',
      type: SchemaType.NODE,
      displayName: 'Node',
      description: 'desc',
      labels: ['a'],
      previewField: 'title',
      fields: [],
      createdAt: {},
    } as unknown as Schema;

    await firstValueFrom(service.updateId('space-1', entity, 's2'));

    expect(doc).toHaveBeenCalledWith({}, 'spaces/space-1/schemas/s2');
    const [, addedEntity] = vi.mocked(setDoc).mock.calls[0];
    expect(addedEntity).toMatchObject({ type: SchemaType.NODE, displayName: 'Node', description: 'desc', previewField: 'title' });
    expect(doc).toHaveBeenCalledWith({}, 'spaces/space-1/schemas/s1');
    expect(deleteDoc).toHaveBeenCalledWith({ path: 'mock-doc-ref' });
  });

  it('updateId() sets the doc with enum fields for ENUM type', async () => {
    const service = setup();
    const entity: SchemaEnum = {
      id: 's1',
      type: SchemaType.ENUM,
      displayName: 'Enum',
      values: [{ name: 'a', value: 'a' }],
      createdAt: {},
    } as unknown as SchemaEnum;

    await firstValueFrom(service.updateId('space-1', entity, 's2'));

    const [, addedEntity] = vi.mocked(setDoc).mock.calls[0];
    expect(addedEntity).toMatchObject({ type: SchemaType.ENUM, displayName: 'Enum', values: entity.values });
  });

  it('updateComponent() deletes empty fields and updates the rest', async () => {
    const service = setup();
    const entity: SchemaComponentUpdate = { displayName: 'Updated' } as unknown as SchemaComponentUpdate;

    await firstValueFrom(service.updateComponent('space-1', 's1', entity));

    const [, updatedFields] = vi.mocked(updateDoc).mock.calls[0];
    expect(updatedFields).toMatchObject({
      displayName: 'Updated',
      description: deleteField(),
      previewField: deleteField(),
      labels: deleteField(),
      fields: deleteField(),
    });
  });

  it('updateEnum() deletes empty fields and updates the rest', async () => {
    const service = setup();
    const entity: SchemaEnumUpdate = { displayName: 'Updated', values: [{ name: 'a', value: 'a' }] } as unknown as SchemaEnumUpdate;

    await firstValueFrom(service.updateEnum('space-1', 's1', entity));

    const [, updatedFields] = vi.mocked(updateDoc).mock.calls[0];
    expect(updatedFields).toMatchObject({
      displayName: 'Updated',
      description: deleteField(),
      labels: deleteField(),
      values: entity.values,
    });
  });

  it('delete() deletes the schema doc at the expected path', async () => {
    const service = setup();

    await firstValueFrom(service.delete('space-1', 's1'));

    expect(doc).toHaveBeenCalledWith({}, 'spaces/space-1/schemas/s1');
    expect(deleteDoc).toHaveBeenCalledWith({ path: 'mock-doc-ref' });
  });
});
