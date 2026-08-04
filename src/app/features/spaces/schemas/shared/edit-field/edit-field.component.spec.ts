import { Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Schema, SchemaFieldKind, SchemaType } from '@shared/models/schema.model';
import { describe, expect, it } from 'vitest';
import { EditFieldComponent } from './edit-field.component';

const SCHEMAS: Schema[] = [
  { id: 'node-b', type: SchemaType.NODE, displayName: 'Bravo' } as Schema,
  { id: 'node-a', type: SchemaType.NODE, displayName: 'Alpha' } as Schema,
  { id: 'node-c', type: SchemaType.NODE } as Schema,
  { id: 'enum-a', type: SchemaType.ENUM, displayName: 'Colors' } as Schema,
];

function baseForm(fb: FormBuilder): FormGroup {
  return fb.group({
    name: [''],
    kind: [''],
    displayName: [''],
    required: [false],
    description: [''],
    defaultValue: [''],
  });
}

@Component({
  template: `<ll-schema-field-edit [form]="form()" [schemas]="schemas()" />`,
  imports: [EditFieldComponent],
})
class EditFieldHostComponent {
  private readonly fb = new FormBuilder();
  readonly form = signal<FormGroup>(baseForm(this.fb));
  readonly schemas = signal<Schema[]>(SCHEMAS);
  readonly editField = viewChild.required(EditFieldComponent);
}

describe('EditFieldComponent', () => {
  function setup() {
    const fixture = TestBed.createComponent(EditFieldHostComponent);
    fixture.detectChanges();
    return { fixture, host: fixture.componentInstance, editField: fixture.componentInstance.editField() };
  }

  describe('form input propagation (reference identity)', () => {
    it('mutations made by the child are visible on the parent-owned FormGroup instance', () => {
      const { host, editField } = setup();
      editField.selectFieldKind(SchemaFieldKind.TEXT);
      expect(editField.form()).toBe(host.form());
      expect(host.form().contains('translatable')).toBe(true);
      expect(host.form().contains('minLength')).toBe(true);
      expect(host.form().contains('maxLength')).toBe(true);
    });

    it('picks up a new FormGroup instance when the parent swaps the input value', async () => {
      const { host, editField, fixture } = setup();
      const replacement = baseForm(new FormBuilder());
      host.form.set(replacement);
      await fixture.whenStable();
      expect(editField.form()).toBe(replacement);
    });
  });

  describe('selectFieldKind', () => {
    const ALL_CONTROLS = [
      'translatable',
      'minLength',
      'maxLength',
      'minValue',
      'maxValue',
      'source',
      'options',
      'minValues',
      'maxValues',
      'schemas',
      'fileType',
      'path',
    ];

    function controlsAfter(kind: SchemaFieldKind): { present: string[]; absent: string[] } {
      const { editField } = setup();
      editField.selectFieldKind(kind);
      const present = ALL_CONTROLS.filter(name => editField.form().contains(name));
      const absent = ALL_CONTROLS.filter(name => !editField.form().contains(name));
      return { present, absent };
    }

    it('TEXT adds translatable/minLength/maxLength and removes everything else', () => {
      const { present, absent } = controlsAfter(SchemaFieldKind.TEXT);
      expect(present.sort()).toEqual(['maxLength', 'minLength', 'translatable']);
      expect(absent).toEqual(expect.arrayContaining(['minValue', 'maxValue', 'source', 'options', 'schemas', 'fileType', 'path']));
    });

    it('NUMBER adds translatable/minValue/maxValue', () => {
      const { present } = controlsAfter(SchemaFieldKind.NUMBER);
      expect(present.sort()).toEqual(['maxValue', 'minValue', 'translatable']);
    });

    it('OPTIONS adds translatable/source/minValues/maxValues', () => {
      const { present } = controlsAfter(SchemaFieldKind.OPTIONS);
      expect(present.sort()).toEqual(['maxValues', 'minValues', 'source', 'translatable']);
    });

    it('ASSET adds translatable/fileType', () => {
      const { present } = controlsAfter(SchemaFieldKind.ASSET);
      expect(present.sort()).toEqual(['fileType', 'translatable']);
    });

    it('REFERENCE adds path and removes translatable (unlike every other kind)', () => {
      const { present, absent } = controlsAfter(SchemaFieldKind.REFERENCE);
      expect(present).toEqual(['path']);
      expect(absent).toContain('translatable');
    });

    it('SCHEMA adds schemas and removes translatable (unlike every other kind)', () => {
      const { present, absent } = controlsAfter(SchemaFieldKind.SCHEMA);
      expect(present).toEqual(['schemas']);
      expect(absent).toContain('translatable');
    });
  });

  describe('nodeSchemas / enumSchemas', () => {
    it('filters to NODE type schemas, sorted', () => {
      const { editField } = setup();
      expect(editField.nodeSchemas().map(s => s.id)).toEqual(['node-a', 'node-b', 'node-c']);
    });

    it('filters to ENUM type schemas', () => {
      const { editField } = setup();
      expect(editField.enumSchemas().map(s => s.id)).toEqual(['enum-a']);
    });
  });

  describe('schemaIdToString / enumSchemaIdToString', () => {
    it('returns displayName when present, falling back to id', () => {
      const { editField } = setup();
      expect(editField.schemaIdToString('node-a')).toBe('Alpha');
      expect(editField.schemaIdToString('node-c')).toBe('node-c');
      expect(editField.schemaIdToString('missing')).toBe('missing');
    });

    it('formats enum labels as "id (displayName)" when displayName is present', () => {
      const { editField } = setup();
      expect(editField.enumSchemaIdToString('enum-a')).toBe('enum-a (Colors)');
      expect(editField.enumSchemaIdToString('missing')).toBe('missing');
    });
  });
});
