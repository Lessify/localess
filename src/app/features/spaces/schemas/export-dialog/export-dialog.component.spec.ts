import { TestBed } from '@angular/core/testing';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { vi } from 'vitest';

import { ExportDialogComponent } from './export-dialog.component';

describe('ExportDialogComponent', () => {
  const close = vi.fn();

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [{ provide: BrnDialogRef, useValue: { close } }] });
  });

  it('creates', () => {
    const fixture = TestBed.createComponent(ExportDialogComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
  });
  it('closes with an empty object when exporting', () => {
    const fixture = TestBed.createComponent(ExportDialogComponent);
    fixture.detectChanges();

    fixture.componentInstance.save();

    expect(close).toHaveBeenCalledWith({});
  });
});
