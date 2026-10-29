import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Schema, SchemaFieldKind, SchemaType } from '@localess/shared';
import { NotificationService } from '@core/services/notification.service';
import { PlatformService } from '@core/services/platform.service';
import { SchemaService } from '@core/services/schema.service';
import { SpaceStore } from '@core/stores/space.store';
import { BehaviorSubject, filter, NEVER, Observable, of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';

import { EditCompComponent } from './edit-comp.component';

function rootSchema(overrides: Partial<Schema> = {}): Schema {
  return {
    id: 'root1',
    name: 'root1',
    type: SchemaType.ROOT,
    displayName: 'Root',
    fields: [],
    ...overrides,
  } as unknown as Schema;
}

/** The label input as the template passes it: Enter calls addLabel(input). */
function labelInput(value: string): HTMLInputElement {
  const input = document.createElement('input');
  input.value = value;
  return input;
}

describe('EditCompComponent', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function setup(entity: Schema, allSchemas: Schema[] = [], isActionSave = false, entity$?: Observable<Schema>) {
    const schemas = signal(allSchemas);
    const findOne = vi.fn().mockReturnValue(entity$ ?? of(entity));
    const update = vi.fn().mockReturnValue(of(entity));
    const success = vi.fn();
    const error = vi.fn();
    const navigate = vi.fn();

    TestBed.overrideComponent(EditCompComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({
      providers: [
        { provide: SchemaService, useValue: { findOne, update } },
        { provide: SpaceStore, useValue: { schemas, schemasLoaded: signal(true) } },
        { provide: NotificationService, useValue: { success, error } },
        { provide: PlatformService, useValue: { isActionSave: vi.fn().mockReturnValue(isActionSave) } },
        { provide: Router, useValue: { navigate } },
      ],
    });
    const fixture = TestBed.createComponent(EditCompComponent);
    fixture.componentRef.setInput('spaceId', 'space-1');
    fixture.componentRef.setInput('schemaId', 'root1');
    fixture.detectChanges();
    return { component: fixture.componentInstance, update, findOne, schemas, success, error, navigate };
  }

  it('loads the schema and populates the form on init', () => {
    const { component } = setup(rootSchema({ displayName: 'Root' }));

    expect(component.entity?.id).toBe('root1');
    expect(component.form.value['displayName']).toBe('Root');
    expect(component.isLoading()).toBe(false);
  });

  it('populates one field group per existing field', () => {
    const { component } = setup(rootSchema({ fields: [{ name: 'title', kind: SchemaFieldKind.TEXT } as never] }));

    expect(component.fields.length).toBe(1);
    expect(component.fieldControlAt(0, 'name')?.value).toBe('title');
  });

  it('keeps unsaved edits when another schema of the space changes (live), but takes the new schema list', () => {
    const { component, schemas } = setup(rootSchema({ fields: [{ name: 'title', kind: SchemaFieldKind.TEXT }] }));
    component.addField();

    const other = rootSchema({ id: 'other', name: 'other' });
    schemas.set([other]);
    TestBed.tick();

    expect(component.fields.length).toBe(2);
    expect(component.isFormDirty).toBe(true);
    expect(component.schemas).toEqual([other]);
  });

  it('save() marks the form saved and shows the schema the server answered, without reading it again', () => {
    const { component, findOne } = setup(rootSchema({ fields: [{ name: 'title', kind: SchemaFieldKind.TEXT }] }));
    component.addField();
    findOne.mockClear();

    component.save();

    expect(findOne).not.toHaveBeenCalled();
    expect(component.isFormDirty).toBe(false);
    expect(component.fields.length).toBe(1);
  });

  it('save() keeps edits made while the request is in flight: still dirty, not reloaded over', () => {
    const { component, update, findOne } = setup(rootSchema({ fields: [{ name: 'title', kind: SchemaFieldKind.TEXT }] }));
    const answer = new Subject<Schema>();
    update.mockReturnValue(answer);
    component.form.controls['displayName'].setValue('Sent');
    component.form.markAsDirty();
    findOne.mockClear();

    component.save();
    component.form.controls['displayName'].setValue('Typed while saving');
    answer.next(rootSchema({ displayName: 'Sent' }));
    answer.complete();

    expect(update.mock.calls[0][2]).toMatchObject({ displayName: 'Sent' });
    expect(component.form.controls['displayName'].value).toBe('Typed while saving');
    expect(component.isFormDirty).toBe(true);
    expect(findOne).not.toHaveBeenCalled();
  });

  it('ignores a live answer older than the version just saved (a refetch that started before Save)', () => {
    const v1 = rootSchema({ updatedAt: '2026-01-01T10:00:00.000Z' });
    const live = new BehaviorSubject<Schema>(v1);
    const { component, findOne } = setup(v1, [], false, live);
    // The reload after Save has not answered yet.
    findOne.mockReturnValue(NEVER);
    component.addLabel(labelInput('marketing'));

    component.save();
    // The stale answer: the schema as it was before the Save (no labels).
    live.next(rootSchema({ updatedAt: '2026-01-01T10:00:00.000Z' }));

    expect(component.form.value['labels']).toEqual(['marketing']);
    // A newer version is taken.
    const v2 = rootSchema({ updatedAt: '2026-01-01T10:00:05.000Z', labels: ['marketing'] });
    live.next(v2);
    expect(component.entity).toBe(v2);
    expect(component.form.value['labels']).toEqual(['marketing']);
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

  it('refuses a new field name that a loaded field already has', () => {
    const { component } = setup(rootSchema({ fields: [{ name: 'title', kind: SchemaFieldKind.TEXT } as never] }));

    component.newFieldName.setValue('title');

    expect(component.newFieldName.errors).toEqual({ reservedName: true });
  });

  it("removeComponent() frees the removed field's name, not another one", () => {
    const { component } = setup(rootSchema());
    component.addField({ name: 'alpha', kind: SchemaFieldKind.TEXT } as never);
    component.addField({ name: 'beta', kind: SchemaFieldKind.TEXT } as never);
    const event = { preventDefault: vi.fn(), stopImmediatePropagation: vi.fn() } as unknown as MouseEvent;
    // Reordered: beta first, so the field's index is no longer its name's.
    component.fieldDropDrop({ previousIndex: 1, currentIndex: 0 } as never);

    component.removeComponent(event, 0);

    component.newFieldName.setValue('alpha');
    expect(component.newFieldName.errors).toEqual({ reservedName: true });
    component.newFieldName.setValue('beta');
    expect(component.newFieldName.errors).toBeNull();
  });

  it('removeComponent() clears the preview field when it removes that field', () => {
    const { component } = setup(
      rootSchema({
        previewField: 'title',
        fields: [
          { name: 'title', kind: SchemaFieldKind.TEXT },
          { name: 'body', kind: SchemaFieldKind.TEXT },
        ] as never,
      } as never),
    );
    const event = { preventDefault: vi.fn(), stopImmediatePropagation: vi.fn() } as unknown as MouseEvent;

    component.removeComponent(event, 1);
    expect(component.form.value['previewField']).toBe('title');
    component.removeComponent(event, 0);
    expect(component.form.value['previewField']).toBeUndefined();
  });

  it("save() shows the server's reason when it refuses the fields", () => {
    const { component, update, error } = setup(rootSchema());
    const message = "Schema 'root1' is not valid: field 'title' is defined more than once";
    update.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 400, error: { message } })));

    component.save();

    expect(error).toHaveBeenCalledWith('Schema can not be updated.', { description: message });
  });

  it('save() shows the first issue when the server refuses the body (a validation list)', () => {
    const { component, update, error } = setup(rootSchema());
    const message = ['fields.0.name: Invalid string: must match pattern', 'fields.1.kind: Invalid option'];
    update.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 400, error: { message } })));

    component.save();

    expect(error).toHaveBeenCalledWith('Schema can not be updated.', { description: message[0] });
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

    component.addLabel(labelInput('one'));
    component.addLabel(labelInput('two'));
    expect(component.form.value['labels']).toEqual(['one', 'two']);

    component.removeLabel('one');
    expect(component.form.value['labels']).toEqual(['two']);
  });

  it('addLabel() ignores an empty value', () => {
    const { component } = setup(rootSchema());

    component.addLabel(labelInput(''));

    expect(component.form.value['labels']).toBeNull();
  });

  it('addLabel() refuses a duplicate or invalid label, keeps the text, and marks the form dirty when it adds', () => {
    const { component } = setup(rootSchema());
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
    const { component, update } = setup(rootSchema(), [], true);
    const event = { preventDefault: vi.fn() } as unknown as KeyboardEvent;

    component.captureKeyboard(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(update).toHaveBeenCalled();
  });

  it('captureKeyboard() does nothing for other key combinations', () => {
    const { component, update } = setup(rootSchema(), [], false);
    const event = { preventDefault: vi.fn() } as unknown as KeyboardEvent;

    component.captureKeyboard(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('save() updates the component and notifies success, resetting the loading flag after a delay', async () => {
    vi.useFakeTimers();
    const { component, update, success } = setup(rootSchema());

    component.save();

    expect(update).toHaveBeenCalledWith('space-1', 'root1', component.form.value);
    // The server refuses an unknown field (a strict body): only the schema's settings are sent.
    expect(
      Object.keys(update.mock.calls[0][2]).every(key => ['displayName', 'description', 'previewField', 'labels', 'fields'].includes(key)),
    ).toBe(true);
    expect(success).toHaveBeenCalledWith('Schema has been updated.');
    expect(component.isSaveLoading()).toBe(true);

    await vi.advanceTimersByTimeAsync(1000);

    expect(component.isSaveLoading()).toBe(false);
  });

  it('save() notifies an error on failure, and Save stops spinning (an error never completes)', async () => {
    vi.useFakeTimers();
    const { component, update, error } = setup(rootSchema());
    update.mockReturnValue(throwError(() => new Error('boom')));

    component.save();

    expect(error).toHaveBeenCalledWith('Schema can not be updated.');
    expect(component.isSaveLoading()).toBe(true);
    await vi.advanceTimersByTimeAsync(1000);
    expect(component.isSaveLoading()).toBe(false);
  });

  it('back() navigates to the schemas list', () => {
    const { component, navigate } = setup(rootSchema());

    component.back();

    expect(navigate).toHaveBeenCalledWith(['features', 'spaces', 'space-1', 'schemas']);
  });
});
