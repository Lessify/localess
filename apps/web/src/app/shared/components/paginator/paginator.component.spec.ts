import { Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { PageEvent, Paginator } from './paginator.component';

@Component({
  template: `<ll-paginator
    [length]="length()"
    [disabled]="disabled()"
    [hidePageSize]="hidePageSize()"
    [showFirstLastButtons]="showFirstLastButtons()"
    [sticky]="sticky()" />`,
  imports: [Paginator],
})
class PaginatorHostComponent {
  readonly length = signal(25);
  readonly disabled = signal(false);
  readonly hidePageSize = signal(false);
  readonly showFirstLastButtons = signal(false);
  readonly sticky = signal(false);
  readonly paginator = viewChild.required(Paginator);
}

describe('Paginator', () => {
  function setup(length = 25) {
    const fixture = TestBed.createComponent(PaginatorHostComponent);
    fixture.componentInstance.length.set(length);
    fixture.detectChanges();
    return { fixture, paginator: fixture.componentInstance.paginator() };
  }

  it('computes page count from length and pageSize (default pageSize 10)', () => {
    const { paginator } = setup(25);
    expect(paginator.pageCount()).toBe(3);
  });

  it('starts on the first page with first/previous disabled', () => {
    const { paginator } = setup(25);
    expect(paginator.pageIndex()).toBe(0);
    expect(paginator.isFirstPage()).toBe(true);
    expect(paginator.isLastPage()).toBe(false);
  });

  it('disables next/last on the last page', () => {
    const { paginator } = setup(25);
    paginator.lastPage();
    expect(paginator.pageIndex()).toBe(2);
    expect(paginator.isLastPage()).toBe(true);
  });

  it('emits a page event with previousPageIndex on nextPage()', () => {
    const { paginator } = setup(25);
    const events: PageEvent[] = [];
    paginator.page.subscribe(e => events.push(e));
    paginator.nextPage();
    expect(events).toEqual([{ pageIndex: 1, previousPageIndex: 0, pageSize: 10, length: 25 }]);
  });

  it('clamps navigation at the lower boundary', () => {
    const { paginator } = setup(25);
    paginator.previousPage();
    expect(paginator.pageIndex()).toBe(0);
  });

  it('clamps navigation at the upper boundary', () => {
    const { paginator } = setup(25);
    paginator.lastPage();
    paginator.nextPage();
    expect(paginator.pageIndex()).toBe(2);
  });

  it('does not emit a page event when navigation is a no-op', () => {
    const { paginator } = setup(25);
    const events: PageEvent[] = [];
    paginator.page.subscribe(e => events.push(e));
    paginator.previousPage();
    expect(events).toEqual([]);
  });

  it('preserves the first visible item when changing page size, mirroring MatPaginator', () => {
    const { paginator } = setup(35);
    // page size 10, page index 2 -> items 20-29 (item 20 is first visible)
    paginator.nextPage();
    paginator.nextPage();
    expect(paginator.pageIndex()).toBe(2);
    // switching to page size 5: item 20 now lives on page floor(20/5) = 4
    paginator.onPageSizeChange(5);
    expect(paginator.pageSize()).toBe(5);
    expect(paginator.pageIndex()).toBe(4);
  });

  it('emits previousPageIndex on page size change', () => {
    const { paginator } = setup(35);
    paginator.nextPage();
    const events: PageEvent[] = [];
    paginator.page.subscribe(e => events.push(e));
    paginator.onPageSizeChange(5);
    expect(events).toEqual([{ pageIndex: 2, previousPageIndex: 1, pageSize: 5, length: 35 }]);
  });

  it('auto-clamps pageIndex when the data shrinks below the current page', async () => {
    const { fixture, paginator } = setup(35);
    paginator.lastPage();
    expect(paginator.pageIndex()).toBe(3);
    fixture.componentInstance.length.set(5);
    await fixture.whenStable();
    expect(paginator.pageIndex()).toBe(0);
  });

  it('ignores navigation and page-size changes while disabled', async () => {
    const { fixture, paginator } = setup(25);
    fixture.componentInstance.disabled.set(true);
    await fixture.whenStable();
    paginator.nextPage();
    paginator.onPageSizeChange(25);
    expect(paginator.pageIndex()).toBe(0);
    expect(paginator.pageSize()).toBe(10);
  });

  it('hides the page-size picker when hidePageSize is set', async () => {
    const { fixture } = setup(25);
    fixture.componentInstance.hidePageSize.set(true);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).not.toContain('Rows per page');
  });

  it('shows the page-size picker by default', () => {
    const { fixture } = setup(25);
    expect(fixture.nativeElement.textContent).toContain('Rows per page');
  });

  it('hides first/last buttons by default', () => {
    const { fixture } = setup(25);
    expect(fixture.nativeElement.querySelector('[aria-label="First page"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[aria-label="Last page"]')).toBeNull();
  });

  it('shows first/last buttons when showFirstLastButtons is set', async () => {
    const { fixture } = setup(25);
    fixture.componentInstance.showFirstLastButtons.set(true);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[aria-label="First page"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[aria-label="Last page"]')).not.toBeNull();
  });

  it('has aria-labels on the previous/next nav buttons', () => {
    const { fixture } = setup(25);
    expect(fixture.nativeElement.querySelector('[aria-label="Previous page"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[aria-label="Next page"]')).not.toBeNull();
  });

  it('does not apply the sticky class by default', () => {
    const { fixture } = setup(25);
    expect(fixture.nativeElement.querySelector('ll-paginator')?.classList.contains('ll-paginator-sticky')).toBe(false);
  });

  it('applies the sticky class when sticky is set', async () => {
    const { fixture } = setup(25);
    fixture.componentInstance.sticky.set(true);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('ll-paginator')?.classList.contains('ll-paginator-sticky')).toBe(true);
  });
});
