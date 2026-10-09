import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { FilterDef } from './filter-toolbar.model';
import { FilterToolbar } from './filter-toolbar.component';

describe('FilterToolbar', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const singleFilter: FilterDef = {
    key: 'status',
    label: 'Status',
    mode: 'single',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
    ],
  };
  const multiFilter: FilterDef = {
    key: 'labels',
    label: 'Labels',
    mode: 'multiple',
    options: [
      { value: 'ui', label: 'UI' },
      { value: 'backend', label: 'Backend' },
    ],
  };

  function setup(filters: FilterDef[] = [singleFilter, multiFilter]) {
    const fixture = TestBed.createComponent(FilterToolbar);
    fixture.componentRef.setInput('filters', filters);
    fixture.detectChanges();
    return { component: fixture.componentInstance };
  }

  it('adds one control per filter definition, defaulting single to "" and multiple to []', () => {
    const { component } = setup();

    expect(component.form.value).toEqual({ search: '', status: '', labels: [] });
  });

  it('hasActiveValues() is false at defaults', () => {
    const { component } = setup();

    expect(component.hasActiveValues()).toBe(false);
  });

  it('hasActiveValues() is true once the search has non-blank text', () => {
    const { component } = setup();

    component.form.controls['search'].setValue('foo');

    expect(component.hasActiveValues()).toBe(true);
  });

  it('hasActiveValues() is true once a single-mode filter is set', () => {
    const { component } = setup();

    component.select(singleFilter, 'active');

    expect(component.hasActiveValues()).toBe(true);
  });

  it('hasActiveValues() is true once a multiple-mode filter has entries', () => {
    const { component } = setup();

    component.select(multiFilter, 'ui');

    expect(component.hasActiveValues()).toBe(true);
  });

  describe('single-mode select/isSelected', () => {
    it('sets the control to the chosen value', () => {
      const { component } = setup();

      component.select(singleFilter, 'active');

      expect(component.isSelected(singleFilter, 'active')).toBe(true);
      expect(component.isSelected(singleFilter, 'inactive')).toBe(false);
    });
  });

  describe('multiple-mode select/isSelected', () => {
    it('adds a value not yet selected', () => {
      const { component } = setup();

      component.select(multiFilter, 'ui');

      expect(component.isSelected(multiFilter, 'ui')).toBe(true);
      expect(component.selectedCount(multiFilter)).toBe(1);
    });

    it('removes a value already selected', () => {
      const { component } = setup();
      component.select(multiFilter, 'ui');
      component.select(multiFilter, 'backend');

      component.select(multiFilter, 'ui');

      expect(component.isSelected(multiFilter, 'ui')).toBe(false);
      expect(component.isSelected(multiFilter, 'backend')).toBe(true);
      expect(component.selectedCount(multiFilter)).toBe(1);
    });
  });

  it('selectedOptionLabel() finds the label for a single-mode selection', () => {
    const { component } = setup();
    component.select(singleFilter, 'active');

    expect(component.selectedOptionLabel(singleFilter)).toBe('Active');
  });

  it('selectedOptionLabel() is undefined when nothing is selected', () => {
    const { component } = setup();

    expect(component.selectedOptionLabel(singleFilter)).toBeUndefined();
  });

  it('reset() clears search and every filter back to its empty default', () => {
    const { component } = setup();
    component.form.controls['search'].setValue('foo');
    component.select(singleFilter, 'active');
    component.select(multiFilter, 'ui');

    component.reset();

    expect(component.form.value).toEqual({ search: '', status: '', labels: [] });
  });

  it('emits a debounced filterChange with the current form value', async () => {
    vi.useFakeTimers();
    const { component } = setup();
    const emitted: unknown[] = [];
    component.filterChange.subscribe(v => emitted.push(v));

    component.form.controls['search'].setValue('foo');
    await vi.advanceTimersByTimeAsync(500);

    expect(emitted).toEqual([{ search: 'foo', status: '', labels: [] }]);
  });

  it('works with no filters configured', () => {
    const { component } = setup([]);

    expect(component.form.value).toEqual({ search: '' });
    expect(component.hasActiveValues()).toBe(false);
  });
});
