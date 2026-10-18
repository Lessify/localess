import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Schema, SchemaType } from '@localess/shared';
import { NotificationService } from '@core/services/notification.service';
import { PlatformService } from '@core/services/platform.service';
import { SchemaService } from '@core/services/schema.service';
import { BehaviorSubject, NEVER, Observable, of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';

import { EditEnumComponent } from './edit-enum.component';

function enumSchema(overrides: Partial<Schema> = {}): Schema {
  return {
    id: 'enum1',
    name: 'enum1',
    type: SchemaType.ENUM,
    displayName: 'Enum',
    values: [],
    ...overrides,
  } as unknown as Schema;
}

/** The label input as the template passes it: Enter calls addLabel(input). */
function labelInput(value: string): HTMLInputElement {
  const input = document.createElement('input');
  input.value = value;
  return input;
}

describe('EditEnumComponent', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function setup(
    entity: Schema,
    allSchemas: Schema[] = [],
    isActionSave = false,
    allSchemas$?: Observable<Schema[]>,
    entity$?: Observable<Schema>,
  ) {
    const findAll = vi.fn().mockReturnValue(allSchemas$ ?? of(allSchemas));
    const findById = vi.fn().mockReturnValue(entity$ ?? of(entity));
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
    return { component: fixture.componentInstance, updateEnum, findById, success, error, navigate };
  }

  it('ignores a live answer older than the version just saved (a refetch that started before Save)', () => {
    const v1 = enumSchema({ updatedAt: '2026-01-01T10:00:00.000Z' });
    const live = new BehaviorSubject<Schema>(v1);
    const { component, findById } = setup(v1, [], false, undefined, live);
    findById.mockReturnValue(NEVER);
    component.addLabel(labelInput('sizes'));

    component.save();
    live.next(enumSchema({ updatedAt: '2026-01-01T10:00:00.000Z' }));

    expect(component.form.value['labels']).toEqual(['sizes']);
  });

  it('shows the schema name under the title, like the component editor (not the internal id)', () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: SchemaService, useValue: { findAll: vi.fn().mockReturnValue(of([])), findById: vi.fn().mockReturnValue(of(enumSchema({ id: '01a1-uuid', name: 'Color', displayName: 'Color' }))) } },
        { provide: NotificationService, useValue: { success: vi.fn(), error: vi.fn() } },
        { provide: PlatformService, useValue: { isActionSave: vi.fn().mockReturnValue(false) } },
        { provide: Router, useValue: { navigate: vi.fn() } },
      ],
    });
    const fixture = TestBed.createComponent(EditEnumComponent);
    fixture.componentRef.setInput('spaceId', 'space-1');
    fixture.componentRef.setInput('schemaId', '01a1-uuid');
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('#Color');
    expect(text).not.toContain('#01a1-uuid');
  });

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

  it('refuses a new value name the loaded schema already has', () => {
    const { component } = setup(enumSchema({ values: [{ name: 'Small', value: 'small' }] }));

    component.newFieldName.setValue('Small');

    expect(component.newFieldName.hasError('reservedName')).toBe(true);
  });

  it('removing a value frees its own name, not another one', () => {
    const { component } = setup(
      enumSchema({
        values: [
          { name: 'Small', value: 'small' },
          { name: 'Large', value: 'large' },
        ],
      }),
    );
    const event = { preventDefault: vi.fn(), stopImmediatePropagation: vi.fn() } as unknown as MouseEvent;

    component.removeComponent(event, 1);

    component.newFieldName.setValue('Large');
    expect(component.newFieldName.hasError('reservedName')).toBe(false);
    component.newFieldName.setValue('Small');
    expect(component.newFieldName.hasError('reservedName')).toBe(true);
  });

  it('keeps unsaved values when another schema of the space changes (live)', () => {
    const all = new BehaviorSubject<Schema[]>([]);
    const { component } = setup(enumSchema(), [], false, all);
    component.newFieldName.setValue('BLUE');
    component.addValueForm();

    all.next([enumSchema({ id: 'other', name: 'other' })]);

    expect(component.values.length).toBe(1);
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

    component.addLabel(labelInput('one'));
    component.addLabel(labelInput('two'));
    expect(component.form.value['labels']).toEqual(['one', 'two']);

    component.removeLabel('one');
    expect(component.form.value['labels']).toEqual(['two']);
  });

  it('addLabel() refuses a duplicate or invalid label, keeps the text, and marks the form dirty when it adds', () => {
    const { component } = setup(enumSchema());
    component.addLabel(labelInput('ui'));
    expect(component.form.dirty).toBe(true);

    for (const value of ['ui', 'has space', 'x']) {
      const input = labelInput(value);
      component.addLabel(input);
      expect(component.labelError()).toBeDefined();
      expect(input.value).toBe(value);
    }
    expect(component.form.value['labels']).toEqual(['ui']);
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

  it('save() keeps edits made while the request is in flight: still dirty, not reloaded over', () => {
    const { component, updateEnum, findById } = setup(enumSchema());
    const answer = new Subject<void>();
    updateEnum.mockReturnValue(answer);
    component.form.controls['displayName'].setValue('Sent');
    component.form.markAsDirty();
    findById.mockClear();

    component.save();
    component.form.controls['displayName'].setValue('Typed while saving');
    answer.next();
    answer.complete();

    expect(updateEnum.mock.calls[0][2]).toMatchObject({ displayName: 'Sent' });
    expect(component.form.controls['displayName'].value).toBe('Typed while saving');
    expect(component.form.dirty).toBe(true);
    expect(findById).not.toHaveBeenCalled();
  });

  it('save() marks the form saved and reloads the stored schema when nothing changed while saving', () => {
    const { component, findById } = setup(enumSchema());
    component.form.controls['displayName'].setValue('Sent');
    component.form.markAsDirty();
    findById.mockClear();

    component.save();

    expect(component.form.dirty).toBe(false);
    expect(findById).toHaveBeenCalledTimes(1);
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
