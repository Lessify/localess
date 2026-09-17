import { TestBed } from '@angular/core/testing';
import { DIALOG_DATA } from '@angular/cdk/dialog';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { Content, ContentFolder, ContentKind } from '@shared/models/content.model';
import { Schema, SchemaType } from '@shared/models/schema.model';
import { ContentService } from '@shared/services/content.service';
import { SchemaService } from '@shared/services/schema.service';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { ReferencesSelectDialogContext } from './references-select-dialog.model';
import { ReferencesSelectDialogComponent } from './references-select-dialog.component';

function folder(overrides: Partial<ContentFolder> = {}): ContentFolder {
  return { id: 'f1', kind: ContentKind.FOLDER, name: 'Docs', fullSlug: '', ...overrides } as unknown as ContentFolder;
}

describe('ReferencesSelectDialogComponent', () => {
  function setup(context: ReferencesSelectDialogContext, contents: Content[] = [], schemas: Schema[] = []) {
    const close = vi.fn();
    const findAllSchemas = vi.fn().mockReturnValue(of(schemas));
    const findAllContents = vi.fn().mockReturnValue(of(contents));

    TestBed.overrideComponent(ReferencesSelectDialogComponent, {
      set: { template: '<table llTableSort></table><ll-paginator [length]="0" />' },
    });
    TestBed.configureTestingModule({
      providers: [
        { provide: DIALOG_DATA, useValue: context },
        { provide: BrnDialogRef, useValue: { close } },
        { provide: SchemaService, useValue: { findAll: findAllSchemas } },
        { provide: ContentService, useValue: { findAll: findAllContents } },
      ],
    });
    const fixture = TestBed.createComponent(ReferencesSelectDialogComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, close, findAllSchemas, findAllContents };
  }

  it('loads root schemas and content on init', () => {
    const items = [folder({ id: 'f1' })];
    const schemas = [{ id: 's1', type: SchemaType.ROOT } as Schema];
    const { component, findAllSchemas, findAllContents } = setup({ spaceId: 'space-1' }, items, schemas);

    expect(findAllSchemas).toHaveBeenCalledWith('space-1', SchemaType.ROOT);
    expect(findAllContents).toHaveBeenCalledWith('space-1', '');
    expect(component.schemas()).toEqual(schemas);
    expect(component.dataSource.filteredData()).toEqual(items);
    expect(component.schemasMapById().get('s1')).toEqual(schemas[0]);
    expect(component.isLoading()).toBe(false);
  });

  it('onRowSelect() toggles selection for documents', () => {
    const { component } = setup({ spaceId: 'space-1' });
    const doc = { id: 'c1', kind: ContentKind.DOCUMENT, name: 'Page' } as unknown as Content;

    component.onRowSelect(doc);

    expect(component.selection.isSelected(doc as never)).toBe(true);
  });

  it('onRowSelect() navigates into folders', () => {
    const { component, findAllContents } = setup({ spaceId: 'space-1' });
    findAllContents.mockClear();

    component.onRowSelect(folder({ id: 'f1', name: 'Docs', fullSlug: 'docs' }));

    expect(findAllContents).toHaveBeenCalledWith('space-1', 'docs');
  });

  it('navigateToSlug() truncates the path after the target segment', () => {
    const { component } = setup({ spaceId: 'space-1' });
    component.onRowSelect(folder({ id: 'a', name: 'A', fullSlug: 'a' }));
    component.onRowSelect(folder({ id: 'b', name: 'B', fullSlug: 'a/b' }));

    component.navigateToSlug({ name: 'A', fullSlug: 'a' });

    expect(component.contentPath).toEqual([{ name: 'Root', fullSlug: '' }, { name: 'A', fullSlug: 'a' }]);
  });
});
