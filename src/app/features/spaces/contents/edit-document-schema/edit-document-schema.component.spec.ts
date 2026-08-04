import { vi } from 'vitest';

// EditDocumentSchemaComponent transitively imports TranslateService (and thus @angular/fire/functions).
// Mirrors the vi.hoisted + full-replacement mock style used in setup.service.spec.ts (rather than
// translate.service.spec.ts's spread-actual style), to avoid a module-hoisting collision between
// the several spec files that touch this module when bundled into the same test run.
vi.mock('@angular/fire/functions', () => ({ Functions: class MockFunctions {}, httpsCallableData: vi.fn() }));

import { TestBed } from '@angular/core/testing';
import { Functions } from '@angular/fire/functions';
import { Router } from '@angular/router';
import { ContentData } from '@shared/models/content.model';
import { CONTENT_DEFAULT_LOCALE, Locale } from '@shared/models/locale.model';
import { Schema, SchemaComponent, SchemaFieldKind, SchemaType } from '@shared/models/schema.model';
import { describe, expect, it } from 'vitest';
import { EditDocumentSchemaComponent } from './edit-document-schema.component';

function schema(fields: SchemaComponent['fields'], id = 'root-1'): SchemaComponent {
  return { id, type: SchemaType.ROOT, fields } as SchemaComponent;
}

function setup(config: { schemas?: Schema[]; data?: ContentData; locale?: Locale } = {}) {
  TestBed.configureTestingModule({
    providers: [
      { provide: Functions, useValue: {} },
      { provide: Router, useValue: {} },
    ],
  });
  const fixture = TestBed.createComponent(EditDocumentSchemaComponent);
  const component = fixture.componentInstance;
  fixture.componentRef.setInput('schemas', config.schemas ?? []);
  fixture.componentRef.setInput('selectedLocale', config.locale ?? CONTENT_DEFAULT_LOCALE);
  fixture.componentRef.setInput('availableLocales', [CONTENT_DEFAULT_LOCALE]);
  fixture.componentRef.setInput('data', config.data ?? { _id: '1', _schema: 'root-1', schema: 'root-1' });
  TestBed.tick(); // flushes the constructor effect that generates the form — does not render the template
  return { fixture, component };
}

describe('EditDocumentSchemaComponent', () => {
  describe('form generation on creation', () => {
    it('finds the root schema matching data().schema and builds a control per field', () => {
      const rootSchema = schema([{ name: 'title', kind: SchemaFieldKind.TEXT } as never]);
      const { component } = setup({ schemas: [rootSchema], data: { _id: '1', schema: 'root-1' } });

      expect(component.rootSchema()).toBe(rootSchema);
      expect(component.form.contains('title')).toBe(true);
    });

    it('patches the form from data() field values after generating it', () => {
      const rootSchema = schema([{ name: 'title', kind: SchemaFieldKind.TEXT } as never]);
      const { component } = setup({ schemas: [rootSchema], data: { _id: '1', schema: 'root-1', title: 'Hello' } });

      expect(component.form.controls['title'].value).toBe('Hello');
    });
  });

  describe('data/locale reactivity — data reference swap (parent-drilldown scenario)', () => {
    it('regenerates the form when the parent swaps in a different document (_id changes)', () => {
      const childSchema = schema([{ name: 'label', kind: SchemaFieldKind.TEXT } as never], 'child-1');
      const rootSchema1 = schema([{ name: 'title', kind: SchemaFieldKind.TEXT } as never], 'root-1');
      const { component, fixture } = setup({
        schemas: [rootSchema1, childSchema],
        data: { _id: '1', schema: 'root-1', title: 'Hello' },
      });
      expect(component.form.contains('title')).toBe(true);
      expect(component.form.contains('label')).toBe(false);

      const newData: ContentData = { _id: '2', schema: 'child-1', label: 'Nested' };
      fixture.componentRef.setInput('data', newData);
      TestBed.tick();

      expect(component.rootSchema()).toBe(childSchema);
      expect(component.form.contains('label')).toBe(true);
      expect(component.form.contains('title')).toBe(false);
      expect(component.form.controls['label'].value).toBe('Nested');
    });

    it('does not regenerate the form when data changes but _id stays the same', () => {
      const rootSchema1 = schema([{ name: 'title', kind: SchemaFieldKind.TEXT } as never], 'root-1');
      const { component, fixture } = setup({
        schemas: [rootSchema1],
        data: { _id: '1', schema: 'root-1', title: 'Hello' },
      });
      expect(component.form.contains('title')).toBe(true);
      const formBeforeChange = component.form;

      const newData: ContentData = { _id: '1', schema: 'root-1', title: 'Updated' };
      fixture.componentRef.setInput('data', newData);
      TestBed.tick();

      expect(component.form).toBe(formBeforeChange);
      expect(component.rootSchema()).toBe(rootSchema1);
    });

    it('regenerates the form when the selected locale changes, even if the document stays the same', () => {
      const rootSchema1 = schema([{ name: 'title', kind: SchemaFieldKind.TEXT } as never], 'root-1');
      const { component, fixture } = setup({
        schemas: [rootSchema1],
        data: { _id: '1', schema: 'root-1', title: 'Hello' },
      });
      const formBeforeChange = component.form;

      fixture.componentRef.setInput('selectedLocale', { id: 'fr', name: 'French' });
      TestBed.tick();

      expect(component.form).not.toBe(formBeforeChange);
      // 'title' isn't translatable, so on a non-default locale its control exists but is disabled —
      // contains() would report false for a disabled control, so check presence directly.
      expect(component.form.controls['title']).toBeDefined();
      expect(component.form.controls['title'].disabled).toBe(true);
    });
  });

  describe('addSchemaOne / removeSchemaOne', () => {
    it('addSchemaOne sets a new nested content reference on data() and emits structureChange', () => {
      const { component, fixture } = setup();
      const events: string[] = [];
      component.structureChange.subscribe(e => events.push(e));
      const targetSchema = schema([], 'child-1');

      component.addSchemaOne({ name: 'child', kind: SchemaFieldKind.SCHEMA } as never, targetSchema);

      expect(component.data()['child']).toMatchObject({ schema: 'child-1', _schema: 'child-1' });
      expect(events).toEqual(['addSchemaOne child child-1']);
      expect(fixture.componentInstance.data()).toBe(component.data());
    });

    it('removeSchemaOne deletes the nested content and emits structureChange', () => {
      const { component } = setup({ data: { _id: '1', schema: 'root-1', child: { _id: '2', schema: 'child-1' } } });
      const events: string[] = [];
      component.structureChange.subscribe(e => events.push(e));

      component.removeSchemaOne({ name: 'child', kind: SchemaFieldKind.SCHEMA } as never);

      expect(component.data()['child']).toBeUndefined();
      expect(events).toEqual(['removeSchemaOne child']);
    });
  });

  describe('addSchemaMany / removeSchemaMany / duplicateSchemaMany', () => {
    it('addSchemaMany appends to an existing array field', () => {
      const { component } = setup({
        data: { _id: '1', schema: 'root-1', children: [{ _id: 'a', schema: 'child-1' }] },
      });
      component.addSchemaMany({ name: 'children', kind: SchemaFieldKind.SCHEMAS } as never, schema([], 'child-1'));
      expect(component.data()['children']).toHaveLength(2);
    });

    it('addSchemaMany creates the array when the field is empty, and inserts at index when given', () => {
      const { component } = setup();
      component.addSchemaMany({ name: 'children', kind: SchemaFieldKind.SCHEMAS } as never, schema([], 'child-1'));
      expect(component.data()['children']).toHaveLength(1);

      component.addSchemaMany({ name: 'children', kind: SchemaFieldKind.SCHEMAS } as never, schema([], 'child-2'), 0);
      expect(component.data()['children'][0].schema).toBe('child-2');
      expect(component.data()['children']).toHaveLength(2);
    });

    it('removeSchemaMany removes the matching item and deletes the field once empty', () => {
      const { component } = setup({
        data: { _id: '1', schema: 'root-1', children: [{ _id: 'a', schema: 'child-1' }] },
      });
      component.removeSchemaMany({ name: 'children', kind: SchemaFieldKind.SCHEMAS } as never, 'a');
      expect(component.data()['children']).toBeUndefined();
    });

    it('duplicateSchemaMany inserts a clone right after the source item with a new _id', () => {
      const { component } = setup();
      const data = [{ _id: 'a', schema: 'child-1', label: 'Original' }];
      component.duplicateSchemaMany(data, data[0], 0);
      expect(data).toHaveLength(2);
      expect(data[1]).toMatchObject({ schema: 'child-1', label: 'Original' });
      expect(data[1]._id).not.toBe('a');
    });
  });

  describe('filterSchema', () => {
    it('resolves node schemas by id and sorts by displayName, falling back to id', () => {
      const nodeB = { id: 'b', type: SchemaType.NODE, displayName: 'Bravo' } as SchemaComponent;
      const nodeA = { id: 'a', type: SchemaType.NODE, displayName: 'Alpha' } as SchemaComponent;
      const nodeC = { id: 'c', type: SchemaType.NODE } as SchemaComponent;
      const { component } = setup({ schemas: [nodeB, nodeA, nodeC] });

      expect(component.filterSchema(['b', 'a', 'c']).map(s => s.id)).toEqual(['a', 'b', 'c']);
    });

    it('drops ids that do not resolve to a node schema', () => {
      const nodeA = { id: 'a', type: SchemaType.NODE, displayName: 'Alpha' } as SchemaComponent;
      const { component } = setup({ schemas: [nodeA] });
      expect(component.filterSchema(['a', 'missing'])).toEqual([nodeA]);
    });
  });

  describe('previewText', () => {
    it('returns the base value on the default locale', () => {
      const { component } = setup();
      const previewSchema = { previewField: 'title', fields: [{ name: 'title', translatable: true }] } as unknown as SchemaComponent;
      expect(component.previewText({ _id: '1', schema: 'x', title: 'Hello' }, previewSchema, 'default')).toBe('Hello');
    });

    it('returns the locale-suffixed value for a translatable preview field on a non-default locale', () => {
      const { component } = setup({ locale: { id: 'fr', name: 'French' } });
      const previewSchema = { previewField: 'title', fields: [{ name: 'title', translatable: true }] } as unknown as SchemaComponent;
      const content = { _id: '1', schema: 'x', title: 'Hello', title_i18n_fr: 'Bonjour' };
      expect(component.previewText(content, previewSchema, 'fr')).toBe('Bonjour');
    });

    it('returns undefined when the schema has no previewField', () => {
      const { component } = setup();
      const previewSchema = {} as SchemaComponent;
      expect(component.previewText({ _id: '1', schema: 'x' }, previewSchema, 'default')).toBeUndefined();
    });
  });

  describe('schemaDropDrop', () => {
    it('reorders the array and emits structureChange', () => {
      const { component } = setup();
      const events: string[] = [];
      component.structureChange.subscribe(e => events.push(e));
      const data = [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }];

      component.schemaDropDrop({ previousIndex: 0, currentIndex: 2 } as never, data);

      expect(data.map(it => it._id)).toEqual(['b', 'c', 'a']);
      expect(events).toEqual(['schemaDropDrop from-0 to-2']);
    });

    it('is a no-op when previousIndex equals currentIndex', () => {
      const { component } = setup();
      const events: string[] = [];
      component.structureChange.subscribe(e => events.push(e));
      const data = [{ _id: 'a' }, { _id: 'b' }];

      component.schemaDropDrop({ previousIndex: 1, currentIndex: 1 } as never, data);

      expect(data.map(it => it._id)).toEqual(['a', 'b']);
      expect(events).toEqual([]);
    });
  });

  describe('output emissions', () => {
    it('navigationTo emits schemaChange with the given ids', () => {
      const { component } = setup();
      const events: unknown[] = [];
      component.schemaChange.subscribe(e => events.push(e));
      component.navigationTo('content-1', 'field-1', 'schema-1');
      expect(events).toEqual([{ contentId: 'content-1', fieldName: 'field-1', schemaName: 'schema-1' }]);
    });

    it('onFieldHover emits schemaHover using data()._id/schema', () => {
      const { component } = setup({ data: { _id: '1', schema: 'root-1' } });
      const events: unknown[] = [];
      component.schemaHover.subscribe(e => events.push(e));
      component.onFieldHover('title');
      expect(events).toEqual([{ id: '1', schema: 'root-1', field: 'title' }]);
    });

    it('onItemHover emits schemaHover using the given item', () => {
      const { component } = setup();
      const events: unknown[] = [];
      component.schemaHover.subscribe(e => events.push(e));
      component.onItemHover({ _id: '2', schema: 'child-1' });
      expect(events).toEqual([{ id: '2', schema: 'child-1' }]);
    });

    it('onSchemaLeave emits schemaLeave', () => {
      const { component } = setup();
      let emitted = false;
      component.schemaLeave.subscribe(() => (emitted = true));
      component.onSchemaLeave();
      expect(emitted).toBe(true);
    });
  });

  describe('change detection', () => {
    // Renders a minimal stub template instead of the real one — the real template pulls in ~10
    // heavy child editors/selectors we don't want to instantiate here. This lets us observe actual
    // rendered DOM through real change-detection cycles without any manual detectChanges() calls
    // of our own, isolating whether the component's own cd.detectChanges()/markForCheck() calls are
    // what keep the view in sync.
    function setupRendered(config: { schemas?: Schema[]; data?: ContentData } = {}) {
      TestBed.configureTestingModule({
        providers: [
          { provide: Functions, useValue: {} },
          { provide: Router, useValue: {} },
        ],
      });
      TestBed.overrideComponent(EditDocumentSchemaComponent, {
        set: { template: `<div class="loading-marker">{{ isFormLoading() }}</div><div class="valid-marker">{{ form.valid }}</div>` },
      });
      const fixture = TestBed.createComponent(EditDocumentSchemaComponent);
      fixture.componentRef.setInput('schemas', config.schemas ?? []);
      fixture.componentRef.setInput('selectedLocale', CONTENT_DEFAULT_LOCALE);
      fixture.componentRef.setInput('availableLocales', [CONTENT_DEFAULT_LOCALE]);
      fixture.componentRef.setInput('data', config.data ?? { _id: '1', schema: 'root-1' });
      fixture.detectChanges(); // initial render + flush constructor effects, incl. form generation
      return { fixture, component: fixture.componentInstance };
    }

    it('reflects a locale change to the loading-marker without an explicit fixture.detectChanges() call', () => {
      const { fixture } = setupRendered();
      fixture.componentRef.setInput('selectedLocale', { id: 'fr', name: 'French' });
      TestBed.tick();
      expect(fixture.nativeElement.querySelector('.loading-marker').textContent.trim()).toBe('false');
    });

    it('reflects a form validity change via onAssetsChange without an explicit fixture.detectChanges() call', () => {
      const rootSchema = schema([{ name: 'title', kind: SchemaFieldKind.TEXT, required: true } as never]);
      const { fixture, component } = setupRendered({ schemas: [rootSchema] });
      expect(fixture.nativeElement.querySelector('.valid-marker').textContent.trim()).toBe('false'); // required title empty -> invalid

      component.form.controls['title'].setValue('Hello');
      component.onAssetsChange();
      TestBed.tick();

      expect(fixture.nativeElement.querySelector('.valid-marker').textContent.trim()).toBe('true');
    });

    it('paints the intermediate loading=true frame mid-onChanged, before generateForm runs', () => {
      const { fixture, component } = setupRendered();
      let midCallSnapshot: string | undefined;
      const originalGenerateForm = component.generateForm.bind(component);
      vi.spyOn(component, 'generateForm').mockImplementation(() => {
        midCallSnapshot = fixture.nativeElement.querySelector('.loading-marker').textContent.trim();
        return originalGenerateForm();
      });

      fixture.componentRef.setInput('selectedLocale', { id: 'fr', name: 'French' });
      TestBed.tick();

      expect(midCallSnapshot).toBe('true');
    });
  });
});
