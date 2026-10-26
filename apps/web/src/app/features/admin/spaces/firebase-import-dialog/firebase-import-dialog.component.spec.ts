import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
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
      findSourceSpaces: vi.fn().mockReturnValue(
        of([
          { id: 'a', name: 'A', importedAs: null },
          { id: 'b', name: 'B', importedAs: { id: 'x', name: 'B (imported)' } },
        ]),
      ),
      start,
      poll: vi.fn().mockReturnValue(of({ id: 'r1', status: 'FINISHED', stages: [] })),
    });
    expect(component.step()).toBe(1);
    component.form.setValue({ origin: 'https://cms.example.com', token: 't' });
    component.connect();
    expect(component.step()).toBe(2);
    expect(component.spaces()!.map(it => it.id)).toEqual(['a', 'b']);
    expect(component.isSelectable(component.spaces()![1])).toBe(false);
    component.selectSpace('a');
    expect(component.selectedName()).toBe('A');
    component.startImport();
    expect(start).toHaveBeenCalledWith('https://cms.example.com', 't', 'a');
    expect(component.step()).toBe(3);
    expect(component.run()).toMatchObject({ id: 'r1', status: 'FINISHED' });
  });

  it('goes back from the spaces to the connection', () => {
    const component = setup({ findSourceSpaces: vi.fn().mockReturnValue(of([{ id: 'a', name: 'A', importedAs: null }])) });
    component.form.setValue({ origin: 'https://cms.example.com', token: 't' });
    component.connect();
    component.selectSpace('a');
    component.back();
    expect(component.step()).toBe(1);
    expect(component.selected()).toBeUndefined();
    // The connection is kept, to change only what was wrong.
    expect(component.form.getRawValue()).toEqual({ origin: 'https://cms.example.com', token: 't' });
  });

  it('opens the imported space once the run finished, closing the dialog', () => {
    const component = setup({});
    const close = TestBed.inject(BrnDialogRef).close;
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component.run.set({ id: 'r1', status: 'FINISHED', spaceId: 's1', stages: [] } as never);
    component.openSpace();
    expect(close).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/features', 'spaces', 's1', 'dashboard']);
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
      findSourceSpaces: vi
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
      findSourceSpaces: vi.fn().mockReturnValue(throwError(() => new HttpErrorResponse({ status: 400, error: { message } }))),
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
      const fixture = render({ findSourceSpaces: vi.fn().mockReturnValue(of(spaces)) });
      fixture.componentInstance.form.setValue({ origin: 'https://cms.example.com', token: 't' });
      fixture.componentInstance.connect();
      fixture.detectChanges();

      const group = (fixture.nativeElement as HTMLElement).querySelector('hlm-radio-group');
      expect(group?.querySelectorAll('hlm-radio').length).toBe(80);
      expect(isBoundedScroll(group?.parentElement ?? null)).toBe(true);
    });

    it('disables a space imported before, and names what it was imported as', () => {
      const spaces = [
        { id: 'a', name: 'A', importedAs: null },
        { id: 'b', name: 'B', importedAs: { id: 'x', name: 'B here' } },
      ];
      const fixture = render({ findSourceSpaces: vi.fn().mockReturnValue(of(spaces)) });
      fixture.componentInstance.form.setValue({ origin: 'https://cms.example.com', token: 't' });
      fixture.componentInstance.connect();
      fixture.detectChanges();

      const radios = [...(fixture.nativeElement as HTMLElement).querySelectorAll('hlm-radio')];
      expect(radios.map(it => it.hasAttribute('data-disabled'))).toEqual([false, true]);
      expect((fixture.nativeElement as HTMLElement).textContent).toContain('Imported as B here');
    });

    it('says when the environment has no spaces', () => {
      const fixture = render({ findSourceSpaces: vi.fn().mockReturnValue(of([])) });
      fixture.componentInstance.form.setValue({ origin: 'https://cms.example.com', token: 't' });
      fixture.componentInstance.connect();
      fixture.detectChanges();

      expect((fixture.nativeElement as HTMLElement).textContent).toContain('This Firebase environment has no spaces.');
    });

    it('scrolls the stage progress of a run inside the dialog', () => {
      const fixture = render({});
      fixture.componentInstance.run.set({
        id: 'r1',
        status: 'FINISHED',
        sourceSpaceName: 'A',
        origin: 'https://cms.example.com',
        stages: [],
      } as never);
      fixture.detectChanges();

      expect(isBoundedScroll((fixture.nativeElement as HTMLElement).querySelector('ll-firebase-import-progress'))).toBe(true);
    });
  });
});
