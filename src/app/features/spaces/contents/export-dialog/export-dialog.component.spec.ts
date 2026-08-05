import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Content, ContentKind } from '@shared/models/content.model';
import { ContentService } from '@shared/services/content.service';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { ExportDialogModel } from './export-dialog.model';
import { ExportDialogComponent } from './export-dialog.component';

describe('ExportDialogComponent', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function setup(data: ExportDialogModel, results: Content[] = []) {
    const findAllByName = vi.fn().mockReturnValue(of(results));
    TestBed.overrideComponent(ExportDialogComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: ContentService, useValue: { findAllByName } },
      ],
    });
    const fixture = TestBed.createComponent(ExportDialogComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, findAllByName };
  }

  it('starts with no path selected', () => {
    const { component } = setup({ spaceId: 'space-1' });

    expect(component.form.value).toEqual({ path: null });
    expect(component.selectedItem()).toBeNull();
  });

  it('searches content for the given space after the debounce window', async () => {
    vi.useFakeTimers();
    const item = { id: 'c1', kind: ContentKind.FOLDER, name: 'Docs', fullSlug: 'docs' } as Content;
    const { component, findAllByName } = setup({ spaceId: 'space-1' }, [item]);
    findAllByName.mockClear();

    component.search.set('doc');
    await vi.advanceTimersByTimeAsync(500);

    expect(findAllByName).toHaveBeenCalledWith('space-1', 'doc', 5);
    expect(component.filteredContents()).toEqual([item]);
  });

  it('onValueChange() sets the selected item and its id as the form path', () => {
    const { component } = setup({ spaceId: 'space-1' });
    const item = { id: 'c1', kind: ContentKind.FOLDER, name: 'Docs', fullSlug: 'docs' } as Content;

    component.onValueChange(item);

    expect(component.selectedItem()).toBe(item);
    expect(component.form.value.path).toBe('c1');
  });

  it('onValueChange(null) clears the selection and the form path', () => {
    const { component } = setup({ spaceId: 'space-1' });
    const item = { id: 'c1', kind: ContentKind.FOLDER, name: 'Docs', fullSlug: 'docs' } as Content;
    component.onValueChange(item);

    component.onValueChange(null);

    expect(component.selectedItem()).toBeNull();
    expect(component.form.value.path).toBeUndefined();
  });

  it('displayItem() shows the name and full slug, or an empty string when absent', () => {
    const { component } = setup({ spaceId: 'space-1' });
    const item = { id: 'c1', kind: ContentKind.FOLDER, name: 'Docs', fullSlug: 'docs' } as Content;

    expect(component['displayItem'](item)).toBe('Docs | docs');
    expect(component['displayItem'](undefined)).toBe('');
  });
});
