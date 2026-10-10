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
      sourceSpaces: vi.fn().mockReturnValue(of([
        { id: 'a', name: 'A', importedAs: null },
        { id: 'b', name: 'B', importedAs: { id: 'x', name: 'B (imported)' } },
      ])),
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

  it('shows the connection error', () => {
    const component = setup({ sourceSpaces: vi.fn().mockReturnValue(throwError(() => ({ error: { message: 'The migration token was refused' } }))) });
    component.form.setValue({ origin: 'https://cms.example.com', token: 'bad' });
    component.connect();
    expect(component.error()).toBe('The migration token was refused');
  });
});
