import { CdkColumnDef } from '@angular/cdk/table';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { describe, expect, it } from 'vitest';
import { TableSort, TableSortHeader, TableSortState } from './table-sort.directive';

@Component({
  template: `<div llTableSort></div>`,
  imports: [TableSort],
})
class SortHostComponent {}

function createSort(): TableSort {
  const fixture = TestBed.createComponent(SortHostComponent);
  fixture.detectChanges();
  return fixture.debugElement.query(By.directive(TableSort)).injector.get(TableSort);
}

describe('TableSort', () => {
  it('activates a column as ascending on first sort', () => {
    const sort = createSort();
    sort.sort('name');
    expect(sort.active()).toBe('name');
    expect(sort.direction()).toBe('asc');
  });

  it('cycles asc -> desc -> none on repeated clicks of the same column', () => {
    const sort = createSort();
    sort.sort('name');
    sort.sort('name');
    expect(sort.direction()).toBe('desc');
    sort.sort('name');
    expect(sort.direction()).toBe('');
    expect(sort.active()).toBe('');
  });

  it('switching to a different column resets to ascending', () => {
    const sort = createSort();
    sort.sort('name');
    sort.sort('name');
    sort.sort('email');
    expect(sort.active()).toBe('email');
    expect(sort.direction()).toBe('asc');
  });

  it('emits sortChange with the new state', () => {
    const sort = createSort();
    const events: TableSortState[] = [];
    sort.sortChange.subscribe(e => events.push(e));
    sort.sort('name');
    expect(events).toEqual([{ active: 'name', direction: 'asc' }]);
  });

});

@Component({
  template: `<div llTableSort [llTableSortDisabled]="true"></div>`,
  imports: [TableSort],
})
class DisabledSortHostComponent {}

describe('TableSort disabled', () => {
  it('does nothing when disabled', () => {
    const fixture = TestBed.createComponent(DisabledSortHostComponent);
    fixture.detectChanges();
    const sort = fixture.debugElement.query(By.directive(TableSort)).injector.get(TableSort);
    sort.sort('name');
    expect(sort.active()).toBe('');
  });
});

@Component({
  template: `<div llTableSort [llTableSortActive]="'name'" [llTableSortDirection]="'desc'"></div>`,
  imports: [TableSort],
})
class SortWithInitialStateHostComponent {}

describe('TableSort initial state', () => {
  it('accepts a declaratively-bound initial active/direction', () => {
    const fixture = TestBed.createComponent(SortWithInitialStateHostComponent);
    fixture.detectChanges();
    const sort = fixture.debugElement.query(By.directive(TableSort)).injector.get(TableSort);
    expect(sort.active()).toBe('name');
    expect(sort.direction()).toBe('desc');
  });
});

@Component({
  template: `<div llTableSort [llTableSortStart]="'desc'" [llTableSortDisableClear]="true"></div>`,
  imports: [TableSort],
})
class SortWithOptionsHostComponent {}

describe('TableSort start/disableClear', () => {
  function createConfiguredSort(): TableSort {
    const fixture = TestBed.createComponent(SortWithOptionsHostComponent);
    fixture.detectChanges();
    return fixture.debugElement.query(By.directive(TableSort)).injector.get(TableSort);
  }

  it('starts descending when start="desc"', () => {
    const sort = createConfiguredSort();
    sort.sort('name');
    expect(sort.direction()).toBe('desc');
  });

  it('cycles desc -> asc without clearing when disableClear is set', () => {
    const sort = createConfiguredSort();
    sort.sort('name');
    sort.sort('name');
    expect(sort.direction()).toBe('asc');
    expect(sort.active()).toBe('name');
    sort.sort('name');
    expect(sort.direction()).toBe('desc');
    expect(sort.active()).toBe('name');
  });
});

@Component({
  template: `
    <div llTableSort>
      <button llTableSortHeader="name" #h="llTableSortHeader"></button>
    </div>
  `,
  imports: [TableSort, TableSortHeader],
})
class SortHeaderHostComponent {}

describe('TableSortHeader', () => {
  function createHeader() {
    const fixture = TestBed.createComponent(SortHeaderHostComponent);
    fixture.detectChanges();
    const buttonDebugEl = fixture.debugElement.query(By.directive(TableSortHeader));
    const header = buttonDebugEl.injector.get(TableSortHeader);
    return { fixture, header, buttonDebugEl };
  }

  it('is inactive with aria-sort="none" before any click', () => {
    const { header } = createHeader();
    expect(header.isActive()).toBe(false);
    expect(header.ariaSort()).toBe('none');
  });

  it('becomes active and ascending on click', () => {
    const { header, buttonDebugEl, fixture } = createHeader();
    buttonDebugEl.triggerEventHandler('click', null);
    fixture.detectChanges();
    expect(header.isActive()).toBe(true);
    expect(header.direction()).toBe('asc');
    expect(header.ariaSort()).toBe('ascending');
  });

  it('cycles to descending on a second click', () => {
    const { header, buttonDebugEl, fixture } = createHeader();
    buttonDebugEl.triggerEventHandler('click', null);
    buttonDebugEl.triggerEventHandler('click', null);
    fixture.detectChanges();
    expect(header.direction()).toBe('desc');
    expect(header.ariaSort()).toBe('descending');
  });

  it('has role="button" and is keyboard-focusable', () => {
    const { buttonDebugEl } = createHeader();
    expect(buttonDebugEl.nativeElement.getAttribute('role')).toBe('button');
    expect(buttonDebugEl.nativeElement.getAttribute('tabindex')).toBe('0');
  });

  it('sorts on Enter keydown', () => {
    const { header, buttonDebugEl, fixture } = createHeader();
    buttonDebugEl.triggerEventHandler('keydown.enter', { preventDefault: () => {} });
    fixture.detectChanges();
    expect(header.isActive()).toBe(true);
    expect(header.direction()).toBe('asc');
  });

  it('sorts on Space keydown', () => {
    const { header, buttonDebugEl, fixture } = createHeader();
    buttonDebugEl.triggerEventHandler('keydown.space', { preventDefault: () => {} });
    fixture.detectChanges();
    expect(header.isActive()).toBe(true);
  });
});

@Component({
  template: `
    <div llTableSort>
      <button llTableSortHeader="name" [disabled]="true" #h="llTableSortHeader"></button>
    </div>
  `,
  imports: [TableSort, TableSortHeader],
})
class DisabledSortHeaderHostComponent {}

describe('TableSortHeader disabled', () => {
  it('does not sort and exposes tabindex=-1/aria-disabled when disabled', () => {
    const fixture = TestBed.createComponent(DisabledSortHeaderHostComponent);
    fixture.detectChanges();
    const buttonDebugEl = fixture.debugElement.query(By.directive(TableSortHeader));
    const header = buttonDebugEl.injector.get(TableSortHeader);
    buttonDebugEl.triggerEventHandler('click', null);
    fixture.detectChanges();
    expect(header.isActive()).toBe(false);
    expect(buttonDebugEl.nativeElement.getAttribute('tabindex')).toBe('-1');
    expect(buttonDebugEl.nativeElement.getAttribute('aria-disabled')).toBe('true');
  });
});

@Component({
  template: `
    <div llTableSort>
      <ng-container cdkColumnDef="fromColumn">
        <button llTableSortHeader #h="llTableSortHeader"></button>
      </ng-container>
    </div>
  `,
  imports: [TableSort, TableSortHeader, CdkColumnDef],
})
class SortHeaderWithoutIdHostComponent {}

describe('TableSortHeader id inference', () => {
  it('defaults its id to the containing CdkColumnDef name when omitted', () => {
    const fixture = TestBed.createComponent(SortHeaderWithoutIdHostComponent);
    fixture.detectChanges();
    const buttonDebugEl = fixture.debugElement.query(By.directive(TableSortHeader));
    const header = buttonDebugEl.injector.get(TableSortHeader);
    expect(header.id()).toBe('fromColumn');
  });
});
