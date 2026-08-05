import { TestBed } from '@angular/core/testing';

import { ExportDialogComponent } from './export-dialog.component';

describe('ExportDialogComponent', () => {
  it('creates', () => {
    const fixture = TestBed.createComponent(ExportDialogComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
  });
});
