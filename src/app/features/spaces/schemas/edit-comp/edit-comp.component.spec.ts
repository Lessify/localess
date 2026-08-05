import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Schema, SchemaFieldKind, SchemaType } from '@shared/models/schema.model';
import { NotificationService } from '@shared/services/notification.service';
import { PlatformService } from '@shared/services/platform.service';
import { SchemaService } from '@shared/services/schema.service';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { EditCompComponent } from './edit-comp.component';

function rootSchema(overrides: Partial<Schema> = {}): Schema {
  return {
    id: 'root1',
    type: SchemaType.ROOT,
    displayName: 'Root',
    fields: [],
    ...overrides,
  } as unknown as Schema;
}

describe('EditCompComponent', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function setup(entity: Schema, allSchemas: Schema[] = [], isActionSave = false) {
    const findAll = vi.fn().mockReturnValue(of(allSchemas));
    const findById = vi.fn().mockReturnValue(of(entity));
    const updateComponent = vi.fn().mockReturnValue(of(undefined));
    const success = vi.fn();
    const error = vi.fn();
    const navigate = vi.fn();

    TestBed.overrideComponent(EditCompComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({
      providers: [
        { provide: SchemaService, useValue: { findAll, findById, updateComponent } },
        { provide: NotificationService, useValue: { success, error } },
        { provide: PlatformService, useValue: { isActionSave: vi.fn().mockReturnValue(isActionSave) } },
        { provide: Router, useValue: { navigate } },
      ],
    });
    const fixture = TestBed.createComponent(EditCompComponent);
    fixture.componentRef.setInput('spaceId', 'space-1');
    fixture.componentRef.setInput('schemaId', 'root1');
    fixture.detectChanges();
    return { component: fixture.componentInstance, updateComponent, success, error, navigate };
  }

  it('loads the schema and populates the form on init', () => {
    const { component } = setup(rootSchema({ displayName: 'Root' }));

    expect(component.entity?.id).toBe('root1');
    expect(component.form.value['displayName']).toBe('Root');
    expect(component.isLoading()).toBe(false);
  });

  it('populates one field group per existing field', () => {
    const { component } = setup(
      rootSchema({ fields: [{ name: 'title', kind: SchemaFieldKind.TEXT } as never] }),
    );

    expect(component.fields.length).toBe(1);
    expect(component.fieldControlAt(0, 'name')?.value).toBe('title');
  });

  it('addField() pushes a new TEXT field by default and selects it', () => {
    const { component } = setup(rootSchema());

    component.addField();

    expect(component.fields.length).toBe(1);
    expect(component.fieldControlAt(0, 'kind')?.value).toBe(SchemaFieldKind.TEXT);
    expect(component.selectedFieldIdx()).toBe(0);
    expect(component.isFormDirty).toBe(true);
  });

  it('addField() adds kind-specific controls for an OPTION field', () => {
    const { component } = setup(rootSchema());

    component.addField({ name: 'opt', kind: SchemaFieldKind.OPTION, source: 'my-enum' } as never);

    expect(component.fieldControlAt(0, 'source')?.value).toBe('my-enum');
    expect(component.fieldControlAt(0, 'translatable')).toBeDefined();
  });

  it('addField() adds a schemas control for a SCHEMA field', () => {
    const { component } = setup(rootSchema());

    component.addField({ name: 'ref', kind: SchemaFieldKind.SCHEMA, schemas: ['other'] } as never);

    expect(component.fieldControlAt(0, 'schemas')?.value).toEqual(['other']);
  });

  it('removeComponent() removes the field at the given index', () => {
    const { component } = setup(rootSchema());
    component.addField({ name: 'a', kind: SchemaFieldKind.TEXT } as never);
    component.addField({ name: 'b', kind: SchemaFieldKind.TEXT } as never);
    const event = { preventDefault: vi.fn(), stopImmediatePropagation: vi.fn() } as unknown as MouseEvent;

    component.removeComponent(event, 0);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(component.fields.length).toBe(1);
    expect(component.fieldControlAt(0, 'name')?.value).toBe('b');
  });

  it('selectComponent() sets the selected field index', () => {
    const { component } = setup(rootSchema());

    component.selectComponent(2);

    expect(component.selectedFieldIdx()).toBe(2);
  });

  it('fieldDropDrop() reorders fields and marks the form dirty', () => {
    const { component } = setup(rootSchema());
    component.addField({ name: 'a', kind: SchemaFieldKind.TEXT } as never);
    component.addField({ name: 'b', kind: SchemaFieldKind.TEXT } as never);

    component.fieldDropDrop({ previousIndex: 0, currentIndex: 1 } as never);

    expect(component.fieldControlAt(0, 'name')?.value).toBe('b');
    expect(component.fieldControlAt(1, 'name')?.value).toBe('a');
  });

  it('fieldDropDrop() no-ops when the index is unchanged', () => {
    const { component } = setup(rootSchema());
    component.addField({ name: 'a', kind: SchemaFieldKind.TEXT } as never);

    component.fieldDropDrop({ previousIndex: 0, currentIndex: 0 } as never);

    expect(component.fieldControlAt(0, 'name')?.value).toBe('a');
  });

  it('addLabel()/removeLabel() manage the labels array', () => {
    const { component } = setup(rootSchema());

    component.addLabel('one');
    component.addLabel('two');
    expect(component.form.value['labels']).toEqual(['one', 'two']);

    component.removeLabel('one');
    expect(component.form.value['labels']).toEqual(['two']);
  });

  it('addLabel() ignores an empty value', () => {
    const { component } = setup(rootSchema());

    component.addLabel('');

    expect(component.form.value['labels']).toBeNull();
  });

  it('captureKeyboard() saves and prevents default on Ctrl/Cmd+S', () => {
    const { component, updateComponent } = setup(rootSchema(), [], true);
    const event = { preventDefault: vi.fn() } as unknown as KeyboardEvent;

    component.captureKeyboard(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(updateComponent).toHaveBeenCalled();
  });

  it('captureKeyboard() does nothing for other key combinations', () => {
    const { component, updateComponent } = setup(rootSchema(), [], false);
    const event = { preventDefault: vi.fn() } as unknown as KeyboardEvent;

    component.captureKeyboard(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(updateComponent).not.toHaveBeenCalled();
  });

  it('save() updates the component and notifies success, resetting the loading flag after a delay', async () => {
    vi.useFakeTimers();
    const { component, updateComponent, success } = setup(rootSchema());

    component.save();

    expect(updateComponent).toHaveBeenCalledWith('space-1', 'root1', component.form.value);
    expect(success).toHaveBeenCalledWith('Schema has been updated.');
    expect(component.isSaveLoading()).toBe(true);

    await vi.advanceTimersByTimeAsync(1000);

    expect(component.isSaveLoading()).toBe(false);
  });

  it('save() notifies an error on failure', () => {
    const { component, updateComponent, error } = setup(rootSchema());
    updateComponent.mockReturnValue(throwError(() => new Error('boom')));

    component.save();

    expect(error).toHaveBeenCalledWith('Schema can not be updated.');
  });

  it('back() navigates to the schemas list', () => {
    const { component, navigate } = setup(rootSchema());

    component.back();

    expect(navigate).toHaveBeenCalledWith(['features', 'spaces', 'space-1', 'schemas']);
  });
});
