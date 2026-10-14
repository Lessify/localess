import { TestBed } from '@angular/core/testing';
import { FirebaseImportService } from '@core/services/firebase-import.service';
import { FirebaseImport } from '@localess/shared';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { FirebaseImportsDialogComponent } from './firebase-imports-dialog.component';

describe('FirebaseImportsDialogComponent', () => {
  const runs = [
    { id: 'r2', sourceSpaceName: 'B', status: 'FAILED', stages: [] },
    { id: 'r1', sourceSpaceName: 'A', status: 'FINISHED', stages: [] },
  ] as unknown as FirebaseImport[];

  function setup(cancel = vi.fn()) {
    TestBed.overrideComponent(FirebaseImportsDialogComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({
      providers: [{ provide: FirebaseImportService, useValue: { findAll: vi.fn().mockReturnValue(of(runs)), cancel } }],
    });
    const fixture = TestBed.createComponent(FirebaseImportsDialogComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('lists the runs, newest first as the API returns them, and opens one', () => {
    const component = setup();
    expect(component.runs().map(it => it.id)).toEqual(['r2', 'r1']);
    expect(component.selectedRun()).toBeUndefined();
    component.select(runs[1]);
    expect(component.selectedRun()?.id).toBe('r1');
  });

  it('tells what to do after a failed run', () => {
    const component = setup();
    expect(component.failureHint({ status: 'FAILED', spaceId: 's1' } as FirebaseImport)).toBe(
      'The space it created is kept as it is: delete it in Admin → Spaces, then import again.',
    );
    expect(component.failureHint({ status: 'FAILED' } as FirebaseImport)).toBe('Nothing was created: start the import again.');
    expect(component.failureHint({ status: 'FINISHED', spaceId: 's1' } as FirebaseImport)).toBeUndefined();
  });

  it('cancels a running run, in the list and in the open view', () => {
    const cancelled = { id: 'r2', sourceSpaceName: 'B', status: 'FAILED', stages: [] } as unknown as FirebaseImport;
    const cancel = vi.fn().mockReturnValue(of(cancelled));
    const component = setup(cancel);
    component.select({ ...runs[0], status: 'RUNNING' });
    component.cancel(component.selectedRun()!);
    expect(cancel).toHaveBeenCalledWith('r2');
    expect(component.selectedRun()).toBe(cancelled);
    expect(component.runs()[0]).toBe(cancelled);
  });

  describe('with its template', () => {
    const isBoundedScroll = (el: Element | null) =>
      !!el && el.classList.contains('overflow-y-auto') && [...el.classList].some(it => it.startsWith('max-h-'));

    function render(list: FirebaseImport[]) {
      TestBed.configureTestingModule({
        providers: [
          { provide: FirebaseImportService, useValue: { findAll: vi.fn().mockReturnValue(of(list)), cancel: vi.fn() } },
          { provide: BrnDialogRef, useValue: { close: vi.fn() } },
        ],
      });
      const fixture = TestBed.createComponent(FirebaseImportsDialogComponent);
      fixture.detectChanges();
      return fixture;
    }

    it('scrolls a long list of runs inside the dialog', () => {
      const many = Array.from({ length: 40 }, (_, i) => ({ ...runs[1], id: `r${i}`, startedBy: { name: 'QA', email: 'qa@example.com' } }));
      const fixture = render(many as FirebaseImport[]);

      const list = (fixture.nativeElement as HTMLElement).querySelector('ul');
      expect(list?.querySelectorAll('li').length).toBe(40);
      expect(isBoundedScroll(list)).toBe(true);
    });

    it("scrolls an opened run's stage progress inside the dialog", () => {
      const listed = runs.map(it => ({ ...it, startedBy: { name: 'QA', email: 'qa@example.com' } }));
      const fixture = render(listed);
      fixture.componentInstance.select(listed[1]);
      fixture.detectChanges();

      expect(isBoundedScroll((fixture.nativeElement as HTMLElement).querySelector('ll-firebase-import-progress'))).toBe(true);
    });
  });
});
