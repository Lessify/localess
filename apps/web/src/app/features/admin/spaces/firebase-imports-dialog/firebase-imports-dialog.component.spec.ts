import { TestBed } from '@angular/core/testing';
import { FirebaseImportService } from '@core/services/firebase-import.service';
import { FirebaseImport } from '@localess/shared';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { FirebaseImportsDialogComponent } from './firebase-imports-dialog.component';

describe('FirebaseImportsDialogComponent', () => {
  const runs = [
    { id: 'r2', sourceSpaceName: 'B', status: 'FAILED', stages: [] },
    { id: 'r1', sourceSpaceName: 'A', status: 'FINISHED', stages: [] },
  ] as unknown as FirebaseImport[];

  function setup() {
    TestBed.overrideComponent(FirebaseImportsDialogComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({ providers: [{ provide: FirebaseImportService, useValue: { findAll: vi.fn().mockReturnValue(of(runs)) } }] });
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
});
