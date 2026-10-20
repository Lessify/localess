import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { FirebaseImportService } from '@core/services/firebase-import.service';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { FirebaseImportDialogComponent } from './firebase-import-dialog.component';

describe('FirebaseImportDialogComponent', () => {
  function setup(service: Partial<Record<keyof FirebaseImportService, unknown>>) {
    TestBed.overrideComponent(FirebaseImportDialogComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({
      providers: [
        { provide: FirebaseImportService, useValue: service },
        { provide: BrnDialogRef, useValue: { close: vi.fn() } },
      ],
    });
    const fixture = TestBed.createComponent(FirebaseImportDialogComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('connects, lists spaces with imported ones disabled, starts the selected one', () => {
    const start = vi.fn().mockReturnValue(of({ id: 'r1', status: 'RUNNING', stages: [] }));
    const component = setup({
      sourceSpaces: vi.fn().mockReturnValue(
        of([
          { id: 'a', name: 'A', importedAs: null },
          { id: 'b', name: 'B', importedAs: { id: 'x', name: 'B (imported)' } },
        ]),
      ),
      start,
      poll: vi.fn().mockReturnValue(of({ id: 'r1', status: 'FINISHED', stages: [] })),
    });
    component.form.setValue({ origin: 'https://cms.example.com', token: 't' });
    component.connect();
    expect(component.spaces().map(it => it.id)).toEqual(['a', 'b']);
    expect(component.isSelectable(component.spaces()[1])).toBe(false);
    component.selected.set('a');
    component.startImport();
    expect(start).toHaveBeenCalledWith('https://cms.example.com', 't', 'a');
    expect(component.run()).toMatchObject({ id: 'r1', status: 'FINISHED' });
  });

  it('cancels the running import and shows the failed run', () => {
    const cancel = vi.fn().mockReturnValue(of({ id: 'r1', status: 'FAILED', stages: [] }));
    const component = setup({ cancel });
    component.run.set({ id: 'r1', status: 'RUNNING', stages: [] } as never);
    component.cancel();
    expect(cancel).toHaveBeenCalledWith('r1');
    expect(component.run()).toMatchObject({ id: 'r1', status: 'FAILED' });
  });

  it('shows why a cancel was refused', () => {
    const component = setup({
      cancel: vi
        .fn()
        .mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { message: 'The import is not running' } }))),
    });
    component.run.set({ id: 'r1', status: 'RUNNING', stages: [] } as never);
    component.cancel();
    expect(component.error()).toBe('The import is not running');
  });

  it('shows the connection error', () => {
    const component = setup({
      sourceSpaces: vi
        .fn()
        .mockReturnValue(throwError(() => new HttpErrorResponse({ status: 400, error: { message: 'The migration token was refused' } }))),
    });
    component.form.setValue({ origin: 'https://cms.example.com', token: 'bad' });
    component.connect();
    expect(component.error()).toBe('The migration token was refused');
  });

  it('shows the first issue of a refused request (a validation list)', () => {
    const message = ['origin: Invalid URL', 'token: Too small: expected string to have >=1 characters'];
    const component = setup({
      sourceSpaces: vi.fn().mockReturnValue(throwError(() => new HttpErrorResponse({ status: 400, error: { message } }))),
    });
    component.form.setValue({ origin: 'https://cms.example.com', token: 'bad' });
    component.connect();
    expect(component.error()).toBe('origin: Invalid URL');
  });

  describe('with its template', () => {
    function render(service: Partial<Record<keyof FirebaseImportService, unknown>>) {
      TestBed.configureTestingModule({
        providers: [
          { provide: FirebaseImportService, useValue: service },
          { provide: BrnDialogRef, useValue: { close: vi.fn() } },
        ],
      });
      const fixture = TestBed.createComponent(FirebaseImportDialogComponent);
      fixture.detectChanges();
      return fixture;
    }

    /** A dialog box grows with its content and nothing scrolls it: a long list must scroll on its own. */
    const isBoundedScroll = (el: Element | null) =>
      !!el && el.classList.contains('overflow-y-auto') && [...el.classList].some(it => it.startsWith('max-h-'));

    it('scrolls a long list of source spaces inside the dialog, so Import stays reachable', () => {
      const spaces = Array.from({ length: 80 }, (_, i) => ({ id: `s${i}`, name: `Space ${i}`, importedAs: null }));
      const fixture = render({ sourceSpaces: vi.fn().mockReturnValue(of(spaces)) });
      fixture.componentInstance.form.setValue({ origin: 'https://cms.example.com', token: 't' });
      fixture.componentInstance.connect();
      fixture.detectChanges();

      const list = (fixture.nativeElement as HTMLElement).querySelector('ul');
      expect(list?.querySelectorAll('li').length).toBe(80);
      expect(isBoundedScroll(list)).toBe(true);
    });

    it('scrolls the stage progress of a run inside the dialog', () => {
      const fixture = render({});
      fixture.componentInstance.run.set({ id: 'r1', status: 'FINISHED', sourceSpaceName: 'A', stages: [] } as never);
      fixture.detectChanges();

      expect(isBoundedScroll((fixture.nativeElement as HTMLElement).querySelector('ll-firebase-import-progress'))).toBe(true);
    });
  });
});
