import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { Schema, SchemaComponent, SchemaFieldKind, SchemaType } from '@shared/models/schema.model';
import { NotificationService } from '@shared/services/notification.service';
import { SchemaService } from '@shared/services/schema.service';
import { TaskService } from '@shared/services/task.service';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { SchemasComponent } from './schemas.component';

function schema(overrides: Partial<Schema> = {}): Schema {
  return { id: 's1', type: SchemaType.NODE, displayName: 'S1', ...overrides } as unknown as Schema;
}

describe('SchemasComponent', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  function setup(schemas: Schema[] = []) {
    const findAll = vi.fn().mockReturnValue(of(schemas));
    const create = vi.fn().mockReturnValue(of(undefined));
    const updateId = vi.fn().mockReturnValue(of(undefined));
    const deleteSchema = vi.fn().mockReturnValue(of(undefined));
    const createSchemaImportTask = vi.fn().mockReturnValue(of({ id: 't1' }));
    const createSchemaExportTask = vi.fn().mockReturnValue(of({ id: 't1' }));
    const navigate = vi.fn();
    const success = vi.fn();
    const error = vi.fn();
    const open = vi.fn();

    TestBed.overrideComponent(SchemasComponent, {
      set: { template: '<table llTableSort></table><ll-paginator [length]="0" />' },
    });
    TestBed.configureTestingModule({
      providers: [
        { provide: SchemaService, useValue: { findAll, create, updateId, delete: deleteSchema } },
        { provide: TaskService, useValue: { createSchemaImportTask, createSchemaExportTask } },
        { provide: NotificationService, useValue: { success, error } },
        { provide: MatDialog, useValue: { open } },
        { provide: Router, useValue: { navigate } },
      ],
    });
    const fixture = TestBed.createComponent(SchemasComponent);
    fixture.componentRef.setInput('spaceId', 'space-1');
    fixture.detectChanges();
    return {
      component: fixture.componentInstance,
      findAll,
      create,
      updateId,
      deleteSchema,
      createSchemaImportTask,
      createSchemaExportTask,
      navigate,
      success,
      error,
      open,
    };
  }

  function fakeEvent(): MouseEvent {
    return { preventDefault: vi.fn(), stopImmediatePropagation: vi.fn() } as unknown as MouseEvent;
  }

  it('loads and sorts schemas on init', () => {
    const b = schema({ id: 'b', displayName: 'B' });
    const a = schema({ id: 'a', displayName: 'A' });
    const { component, findAll } = setup([b, a]);

    expect(findAll).toHaveBeenCalledWith('space-1');
    expect(component.schemas().map(s => s.id)).toEqual(['a', 'b']);
    expect(component.isLoading()).toBe(false);
  });

  it('onFilterChange() serializes the value and updates selectedLabels', () => {
    const { component } = setup();

    component.onFilterChange({ search: '', labels: ['a', 'b'] });

    expect(component.selectedLabels()).toEqual(['a', 'b']);
    expect(component.dataSource.filter).toBe(JSON.stringify({ search: '', labels: ['a', 'b'] }));
  });

  it('onFilterChange() defaults selectedLabels to an empty array', () => {
    const { component } = setup();

    component.onFilterChange({ search: '' });

    expect(component.selectedLabels()).toEqual([]);
  });

  it('openAddDialog() creates the schema and notifies success when confirmed', () => {
    const { component, open, create, success } = setup([schema({ id: 'existing' })]);
    open.mockReturnValue({ afterClosed: () => of({ id: 'new', type: SchemaType.NODE }) });

    component.openAddDialog();

    expect(open).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ data: { reservedIds: ['existing'] } }));
    expect(create).toHaveBeenCalledWith('space-1', { id: 'new', type: SchemaType.NODE });
    expect(success).toHaveBeenCalledWith('Schema has been created.');
  });

  it('openAddDialog() notifies an error on failure', () => {
    const { component, open, create, error } = setup();
    create.mockReturnValue(throwError(() => new Error('boom')));
    open.mockReturnValue({ afterClosed: () => of({ id: 'new', type: SchemaType.NODE }) });

    component.openAddDialog();

    expect(error).toHaveBeenCalledWith('Schema can not be created.');
  });

  it('openEditIdDialog() prevents default, updates the id, and notifies success', () => {
    const { component, open, updateId, success } = setup();
    const event = fakeEvent();
    open.mockReturnValue({ afterClosed: () => of('new-id') });
    const element = schema({ id: 's1' });

    component.openEditIdDialog(event, element);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.stopImmediatePropagation).toHaveBeenCalled();
    expect(updateId).toHaveBeenCalledWith('space-1', element, 'new-id');
    expect(success).toHaveBeenCalledWith('Schema ID has been updated.');
  });

  it('openEditIdDialog() notifies an error on failure', () => {
    const { component, open, updateId, error } = setup();
    updateId.mockReturnValue(throwError(() => new Error('boom')));
    open.mockReturnValue({ afterClosed: () => of('new-id') });

    component.openEditIdDialog(fakeEvent(), schema({ id: 's1' }));

    expect(error).toHaveBeenCalledWith('Schema ID can not be updated.');
  });

  it('onRowSelect() navigates to the component editor for ROOT/NODE schemas', () => {
    const { component, navigate } = setup();

    component.onRowSelect(schema({ id: 's1', type: SchemaType.ROOT }));

    expect(navigate).toHaveBeenCalledWith(['features', 'spaces', 'space-1', 'schemas', 'comp', 's1']);
  });

  it('onRowSelect() navigates to the enum editor for ENUM schemas', () => {
    const { component, navigate } = setup();

    component.onRowSelect(schema({ id: 's1', type: SchemaType.ENUM }));

    expect(navigate).toHaveBeenCalledWith(['features', 'spaces', 'space-1', 'schemas', 'enum', 's1']);
  });

  it('openDeleteDialog() prevents default, deletes, and notifies success when confirmed', () => {
    const { component, open, deleteSchema, success } = setup();
    const event = fakeEvent();
    open.mockReturnValue({ afterClosed: () => of(true) });

    component.openDeleteDialog(event, schema({ id: 's1' }));

    expect(event.preventDefault).toHaveBeenCalled();
    expect(deleteSchema).toHaveBeenCalledWith('space-1', 's1');
    expect(success).toHaveBeenCalledWith("Schema 's1' has been deleted.");
  });

  it('openDeleteDialog() does not delete when cancelled', () => {
    const { component, open, deleteSchema } = setup();
    open.mockReturnValue({ afterClosed: () => of(false) });

    component.openDeleteDialog(fakeEvent(), schema({ id: 's1' }));

    expect(deleteSchema).not.toHaveBeenCalled();
  });

  it('openImportDialog() creates the import task and notifies success', () => {
    const { component, open, createSchemaImportTask, success } = setup();
    const file = new File(['data'], 'schemas.zip');
    open.mockReturnValue({ afterClosed: () => of({ file }) });

    component.openImportDialog();

    expect(createSchemaImportTask).toHaveBeenCalledWith('space-1', file);
    expect(success).toHaveBeenCalledWith('Schema Import Task has been created.', expect.anything());
  });

  it('openExportDialog() creates the export task and notifies success', () => {
    const { component, open, createSchemaExportTask, success } = setup();
    open.mockReturnValue({ afterClosed: () => of({}) });

    component.openExportDialog();

    expect(createSchemaExportTask).toHaveBeenCalledWith('space-1');
    expect(success).toHaveBeenCalledWith('Schema Export Task has been created.', expect.anything());
  });

  describe('inUseSchema', () => {
    it('maps a SCHEMA/SCHEMAS field reference back to the owning schema id', () => {
      const { component } = setup();
      const owner: SchemaComponent = {
        id: 'owner',
        type: SchemaType.NODE,
        fields: [{ name: 'ref', kind: SchemaFieldKind.SCHEMA, schemas: ['target'] } as never],
      } as unknown as SchemaComponent;

      const result = component.inUseSchema([owner]);

      expect(result['target']).toEqual(['owner']);
    });

    it('maps an OPTION/OPTIONS field source back to the owning schema id', () => {
      const { component } = setup();
      const owner: SchemaComponent = {
        id: 'owner',
        type: SchemaType.NODE,
        fields: [{ name: 'opt', kind: SchemaFieldKind.OPTION, source: 'my-enum' } as never],
      } as unknown as SchemaComponent;

      const result = component.inUseSchema([owner]);

      expect(result['my-enum']).toEqual(['owner']);
    });

    it('accumulates multiple owners for the same referenced schema', () => {
      const { component } = setup();
      const ownerA: SchemaComponent = {
        id: 'a',
        type: SchemaType.NODE,
        fields: [{ name: 'ref', kind: SchemaFieldKind.SCHEMA, schemas: ['target'] } as never],
      } as unknown as SchemaComponent;
      const ownerB: SchemaComponent = {
        id: 'b',
        type: SchemaType.NODE,
        fields: [{ name: 'ref', kind: SchemaFieldKind.SCHEMAS, schemas: ['target'] } as never],
      } as unknown as SchemaComponent;

      const result = component.inUseSchema([ownerA, ownerB]);

      expect(result['target']).toEqual(['a', 'b']);
    });

    it('ignores ENUM schemas and fields without schema/option references', () => {
      const { component } = setup();
      const enumSchema = schema({ id: 'e1', type: SchemaType.ENUM });

      const result = component.inUseSchema([enumSchema]);

      expect(result).toEqual({});
    });
  });
});
