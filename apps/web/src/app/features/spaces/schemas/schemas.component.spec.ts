import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { Router } from '@angular/router';
import { Schema, SchemaComponent, SchemaFieldKind, SchemaType } from '@localess/shared';
import { NotificationService } from '@core/services/notification.service';
import { SchemaService } from '@core/services/schema.service';
import { TaskService } from '@core/services/task.service';
import { SpaceStore } from '@core/stores/space.store';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { SchemasComponent } from './schemas.component';

function schema(overrides: Partial<Schema> = {}): Schema {
  return { id: 's1', name: 's1', type: SchemaType.NODE, displayName: 'S1', ...overrides } as unknown as Schema;
}

describe('SchemasComponent', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  function setup(schemas: Schema[] = []) {
    const create = vi.fn().mockReturnValue(of(undefined));
    const rename = vi.fn().mockReturnValue(of(undefined));
    const findUsage = vi.fn().mockReturnValue(of({ fields: [], contents: { count: 0, first: [] } }));
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
        { provide: SchemaService, useValue: { create, rename, findUsage, remove: deleteSchema } },
        { provide: SpaceStore, useValue: { schemas: signal(schemas), schemasLoaded: signal(true) } },
        { provide: TaskService, useValue: { createSchemaImportTask, createSchemaExportTask } },
        { provide: NotificationService, useValue: { success, error } },
        { provide: HlmDialogService, useValue: { open } },
        { provide: Router, useValue: { navigate } },
      ],
    });
    const fixture = TestBed.createComponent(SchemasComponent);
    fixture.componentRef.setInput('spaceId', 'space-1');
    fixture.detectChanges();
    return {
      component: fixture.componentInstance,
      create,
      rename,
      findUsage,
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

  function conflict(message: string): HttpErrorResponse {
    return new HttpErrorResponse({ status: 409, error: { message } });
  }

  it("shows the space's schemas from SpaceStore, sorted, without a request of its own", () => {
    const b = schema({ id: 'b', name: 'b', displayName: 'B' });
    const a = schema({ id: 'a', name: 'a', displayName: 'A' });
    const { component } = setup([b, a]);

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
    const { component, open, create, success } = setup([schema({ id: 'uuid-existing', name: 'existing' })]);
    open.mockReturnValue({ closed$: of({ name: 'new', type: SchemaType.NODE }) });

    component.openAddDialog();

    expect(open).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ context: { reservedNames: ['existing'] } }));
    expect(create).toHaveBeenCalledWith('space-1', { name: 'new', type: SchemaType.NODE });
    expect(success).toHaveBeenCalledWith('Schema has been created.');
  });

  it('openAddDialog() notifies an error on failure', () => {
    const { component, open, create, error } = setup();
    create.mockReturnValue(throwError(() => new Error('boom')));
    open.mockReturnValue({ closed$: of({ name: 'new', type: SchemaType.NODE }) });

    component.openAddDialog();

    expect(error).toHaveBeenCalledWith('Schema can not be created.');
  });

  it('openEditIdDialog() prevents default, updates the id, and notifies success', () => {
    const { component, open, rename, success } = setup();
    const event = fakeEvent();
    open.mockReturnValue({ closed$: of('new-id') });
    const element = schema({ id: 's1' });

    component.openEditIdDialog(event, element);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.stopImmediatePropagation).toHaveBeenCalled();
    expect(rename).toHaveBeenCalledWith('space-1', element.id, 'new-id');
    expect(success).toHaveBeenCalledWith('Schema ID has been updated.');
  });

  it('openEditIdDialog() passes what uses the schema to the dialog, and opens it without when that fails', () => {
    const { component, open, findUsage } = setup();
    const inUse = { fields: [{ schema: 'page', field: 'items' }], contents: { count: 0, first: [] } };
    findUsage.mockReturnValue(of(inUse));
    open.mockReturnValue({ closed$: of(undefined) });

    component.openEditIdDialog(fakeEvent(), schema({ id: 's1', name: 'card' }));
    expect(findUsage).toHaveBeenCalledWith('space-1', 's1');
    expect(open.mock.calls[0][1].context).toMatchObject({ name: 'card', usage: inUse });

    findUsage.mockReturnValue(throwError(() => new Error('boom')));
    component.openEditIdDialog(fakeEvent(), schema({ id: 's1', name: 'card' }));
    expect(open.mock.calls[1][1].context.usage).toBeUndefined();
  });

  it("openEditIdDialog() shows the server's reason when it refuses the rename", () => {
    const { component, open, rename, error } = setup();
    open.mockReturnValue({ closed$: of('tile') });
    rename.mockReturnValue(throwError(() => conflict("Schema 'card' is in use: referenced by 'page' field 'items'")));

    component.openEditIdDialog(fakeEvent(), schema({ id: 's1', name: 'card' }));

    expect(error).toHaveBeenCalledWith('Schema ID can not be updated.', {
      description: "Schema 'card' is in use: referenced by 'page' field 'items'",
    });
  });

  it('openDeleteDialog() lists what uses the schema and offers no delete while it is in use', () => {
    const { component, open, findUsage, deleteSchema } = setup();
    findUsage.mockReturnValue(of({ fields: [], contents: { count: 1, first: [{ name: 'Home', fullSlug: 'home' }] } }));
    open.mockReturnValue({ closed$: of(undefined) });

    component.openDeleteDialog(fakeEvent(), schema({ id: 's1', name: 'page' }));

    expect(open.mock.calls[0][1].context).toMatchObject({
      title: 'Delete Schema',
      content: "Schema 'page' can not be deleted while it is in use.\nUsed by 1 content:\n• Home (home)",
      confirmable: false,
    });
    expect(deleteSchema).not.toHaveBeenCalled();
  });

  it("openDeleteDialog() asks and deletes when nothing uses the schema, showing the server's reason if it refuses", () => {
    const { component, open, deleteSchema, error } = setup();
    open.mockReturnValue({ closed$: of(true) });

    component.openDeleteDialog(fakeEvent(), schema({ id: 's1', name: 'page' }));
    expect(open.mock.calls[0][1].context.confirmable).toBeUndefined();
    expect(deleteSchema).toHaveBeenCalledWith('space-1', 's1');

    deleteSchema.mockReturnValue(throwError(() => conflict("Schema 'page' is in use: used by 1 content: Home (home)")));
    component.openDeleteDialog(fakeEvent(), schema({ id: 's1', name: 'page' }));
    expect(error).toHaveBeenCalledWith("Schema 'page' can not be deleted.", {
      description: "Schema 'page' is in use: used by 1 content: Home (home)",
    });
  });

  it('openEditIdDialog() notifies an error on failure', () => {
    const { component, open, rename, error } = setup();
    rename.mockReturnValue(throwError(() => new Error('boom')));
    open.mockReturnValue({ closed$: of('new-id') });

    component.openEditIdDialog(fakeEvent(), schema({ id: 's1' }));

    expect(error).toHaveBeenCalledWith('Schema ID can not be updated.');
  });

  it('onRowSelect() navigates to the component editor for ROOT/NODE schemas', () => {
    const { component, navigate } = setup();

    component.onRowSelect(schema({ id: 's1', name: 's1', type: SchemaType.ROOT }));

    expect(navigate).toHaveBeenCalledWith(['features', 'spaces', 'space-1', 'schemas', 'comp', 's1']);
  });

  it('onRowSelect() navigates to the enum editor for ENUM schemas', () => {
    const { component, navigate } = setup();

    component.onRowSelect(schema({ id: 's1', name: 's1', type: SchemaType.ENUM }));

    expect(navigate).toHaveBeenCalledWith(['features', 'spaces', 'space-1', 'schemas', 'enum', 's1']);
  });

  it('openDeleteDialog() prevents default, deletes, and notifies success when confirmed', () => {
    const { component, open, deleteSchema, success } = setup();
    const event = fakeEvent();
    open.mockReturnValue({ closed$: of(true) });

    component.openDeleteDialog(event, schema({ id: 's1' }));

    expect(event.preventDefault).toHaveBeenCalled();
    expect(deleteSchema).toHaveBeenCalledWith('space-1', 's1');
    expect(success).toHaveBeenCalledWith("Schema 's1' has been deleted.");
  });

  it('openDeleteDialog() does not delete when cancelled', () => {
    const { component, open, deleteSchema } = setup();
    open.mockReturnValue({ closed$: of(undefined) });

    component.openDeleteDialog(fakeEvent(), schema({ id: 's1' }));

    expect(deleteSchema).not.toHaveBeenCalled();
  });

  it('openImportDialog() creates the import task and notifies success', () => {
    const { component, open, createSchemaImportTask, success } = setup();
    const file = new File(['data'], 'schemas.zip');
    open.mockReturnValue({ closed$: of({ file }) });

    component.openImportDialog();

    expect(createSchemaImportTask).toHaveBeenCalledWith('space-1', file);
    expect(success).toHaveBeenCalledWith('Schema Import Task has been created.', expect.anything());
  });

  it('openExportDialog() creates the export task and notifies success', () => {
    const { component, open, createSchemaExportTask, success } = setup();
    open.mockReturnValue({ closed$: of({}) });

    component.openExportDialog();

    expect(createSchemaExportTask).toHaveBeenCalledWith('space-1');
    expect(success).toHaveBeenCalledWith('Schema Export Task has been created.', expect.anything());
  });

  describe('inUseSchema', () => {
    it('maps a SCHEMA/SCHEMAS field reference back to the owning schema id', () => {
      const { component } = setup();
      const owner: SchemaComponent = {
        id: 'owner',
        name: 'owner',
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
        name: 'owner',
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
        name: 'a',
        type: SchemaType.NODE,
        fields: [{ name: 'ref', kind: SchemaFieldKind.SCHEMA, schemas: ['target'] } as never],
      } as unknown as SchemaComponent;
      const ownerB: SchemaComponent = {
        id: 'b',
        name: 'b',
        type: SchemaType.NODE,
        fields: [{ name: 'ref', kind: SchemaFieldKind.SCHEMAS, schemas: ['target'] } as never],
      } as unknown as SchemaComponent;

      const result = component.inUseSchema([ownerA, ownerB]);

      expect(result['target']).toEqual(['a', 'b']);
    });

    it('ignores ENUM schemas and fields without schema/option references', () => {
      const { component } = setup();
      const enumSchema = schema({ id: 'e1', name: 'e1', type: SchemaType.ENUM });

      const result = component.inUseSchema([enumSchema]);

      expect(result).toEqual({});
    });
  });
});
