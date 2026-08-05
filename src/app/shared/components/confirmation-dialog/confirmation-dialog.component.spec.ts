import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

import { ConfirmationDialogModel } from './confirmation-dialog.model';
import { ConfirmationDialogComponent } from './confirmation-dialog.component';

describe('ConfirmationDialogComponent', () => {
  it('exposes the injected dialog data', () => {
    const data: ConfirmationDialogModel = { title: 'Delete Space', content: 'Are you sure?' };
    TestBed.configureTestingModule({ providers: [{ provide: MAT_DIALOG_DATA, useValue: data }] });

    const fixture = TestBed.createComponent(ConfirmationDialogComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.data).toEqual(data);
  });
});
