import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Schema, SchemaType } from '@shared/models/schema.model';
import { NotificationService } from '@shared/services/notification.service';
import { PlatformService } from '@shared/services/platform.service';
import { SchemaService } from '@shared/services/schema.service';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { EditEnumComponent } from './edit-enum.component';

function enumSchema(overrides: Partial<Schema> = {}): Schema {
  return {
    id: 'enum1',
    type: SchemaType.ENUM,
    displayName: 'Enum',
    values: [],
    ...overrides,
  } as unknown as Schema;
}

describe('EditEnumComponent', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function setup(entity: Schema, allSchemas: Schema[] = [], isActionSave = false) {
    const findAll = vi.fn().mockReturnValue(of(allSchemas));
    const findById = vi.fn().mockReturnValue(of(entity));
    const updateEnum = vi.fn().mockReturnValue(of(undefined));
    const success = vi.fn();
    const error = vi.fn();
    const navigate = vi.fn();

    TestBed.overrideComponent(EditEnumComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({
      providers: [
        { provide: SchemaService, useValue: { findAll, findById, updateEnum } },
        { provide: NotificationService, useValue: { success, error } },
        { provide: PlatformService, useValue: { isActionSave: vi.fn().mockReturnValue(isActionSave) } },
        { provide: Router, useValue: { navigate } },
      ],
    });
    const fixture = TestBed.createComponent(EditEnumComponent);
    fixture.componentRef.setInput('spaceId', 'space-1');
    fixture.componentRef.setInput('schemaId', 'enum1');
    fixture.detectChanges();
    return { component: fixture.componentInstance, updateEnum, success, error, navigate };
  }

  it('loads the schema and populates the form on init', () => {
    const { component } = setup(enumSchema({ displayName: 'Enum' }));

    expect(component.entity?.id).toBe('enum1');
    expect(component.form.value['displayName']).toBe('Enum');
    expect(component.isLoading()).toBe(false);
  });

  it('populates one value group per existing enum value', () => {
    const { component } = setup(enumSchema({ values: [{ name: 'RED', value: 'red' }] }));

    expect(component.values.length).toBe(1);
    expect(component.valueControlAt(0, 'name')?.value).toBe('RED');
  });

  it('addValueForm() with no argument pushes the pending new-field name and selects it', () => {
    const { component } = setup(enumSchema());
    component.newFieldName.setValue('BLUE');

    component.addValueForm();

    expect(component.values.length).toBe(1);
    expect(component.valueControlAt(0, 'name')?.value).toBe('BLUE');
    expect(component.valueControlAt(0, 'value')?.value).toBe('BLUE');
    expect(component.selectedFieldIdx()).toBe(0);
    expect(component.isFormDirty).toBe(true);
    expect(component.newFieldName.value).toBeFalsy();
  });

  it('addValueForm() with an element appends it without marking the form dirty', () => {
    const { component } = setup(enumSchema());

    component.addValueForm({ name: 'GREEN', value: 'green' });

    expect(component.values.length).toBe(1);
    expect(component.valueControlAt(0, 'value')?.value).toBe('green');
    expect(component.isFormDirty).toBe(false);
  });

  it('removeComponent() removes the value at the given index', () => {
    const { component } = setup(enumSchema());
    component.addValueForm({ name: 'A', value: 'a' });
    component.addValueForm({ name: 'B', value: 'b' });
    const event = { preventDefault: vi.fn(), stopImmediatePropagation: vi.fn() } as unknown as MouseEvent;

    component.removeComponent(event, 0);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(component.values.length).toBe(1);
    expect(component.valueControlAt(0, 'name')?.value).toBe('B');
  });

  it('selectComponent() sets the selected field index', () => {
    const { component } = setup(enumSchema());

    component.selectComponent(1);

    expect(component.selectedFieldIdx()).toBe(1);
  });

  it('fieldDropDrop() reorders values', () => {
    const { component } = setup(enumSchema());
    component.addValueForm({ name: 'A', value: 'a' });
    component.addValueForm({ name: 'B', value: 'b' });

    component.fieldDropDrop({ previousIndex: 0, currentIndex: 1 } as never);

    expect(component.valueControlAt(0, 'name')?.value).toBe('B');
    expect(component.valueControlAt(1, 'name')?.value).toBe('A');
  });

  it('fieldDropDrop() no-ops when the index is unchanged', () => {
    const { component } = setup(enumSchema());
    component.addValueForm({ name: 'A', value: 'a' });

    component.fieldDropDrop({ previousIndex: 0, currentIndex: 0 } as never);

    expect(component.valueControlAt(0, 'name')?.value).toBe('A');
  });

  it('addLabel()/removeLabel() manage the labels array', () => {
    const { component } = setup(enumSchema());

    component.addLabel('one');
    component.addLabel('two');
    expect(component.form.value['labels']).toEqual(['one', 'two']);

    component.removeLabel('one');
    expect(component.form.value['labels']).toEqual(['two']);
  });

  it('captureKeyboard() saves and prevents default on Ctrl/Cmd+S', () => {
    const { component, updateEnum } = setup(enumSchema(), [], true);
    const event = { preventDefault: vi.fn() } as unknown as KeyboardEvent;

    component.captureKeyboard(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(updateEnum).toHaveBeenCalled();
  });

  it('captureKeyboard() does nothing for other key combinations', () => {
    const { component, updateEnum } = setup(enumSchema(), [], false);
    const event = { preventDefault: vi.fn() } as unknown as KeyboardEvent;

    component.captureKeyboard(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(updateEnum).not.toHaveBeenCalled();
  });

  it('save() updates the enum and notifies success, resetting the loading flag after a delay', async () => {
    vi.useFakeTimers();
    const { component, updateEnum, success } = setup(enumSchema());

    component.save();

    expect(updateEnum).toHaveBeenCalledWith('space-1', 'enum1', component.form.value);
    expect(success).toHaveBeenCalledWith('Schema has been updated.');
    expect(component.isSaveLoading()).toBe(true);

    await vi.advanceTimersByTimeAsync(1000);

    expect(component.isSaveLoading()).toBe(false);
  });

  it('save() notifies an error on failure', () => {
    const { component, updateEnum, error } = setup(enumSchema());
    updateEnum.mockReturnValue(throwError(() => new Error('boom')));

    component.save();

    expect(error).toHaveBeenCalledWith('Schema can not be updated.');
  });

  it('back() navigates to the schemas list', () => {
    const { component, navigate } = setup(enumSchema());

    component.back();

    expect(navigate).toHaveBeenCalledWith(['features', 'spaces', 'space-1', 'schemas']);
  });
});
