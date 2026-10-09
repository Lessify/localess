import { DIALOG_DATA } from '@angular/cdk/dialog';
import { TestBed } from '@angular/core/testing';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { vi } from 'vitest';

import { ConfirmationDialogContext } from './confirmation-dialog.model';
import { ConfirmationDialogComponent } from './confirmation-dialog.component';

describe('ConfirmationDialogComponent', () => {
  const close = vi.fn();

  function setup(context: ConfirmationDialogContext) {
    TestBed.configureTestingModule({
      providers: [
        { provide: DIALOG_DATA, useValue: context },
        { provide: BrnDialogRef, useValue: { close } },
      ],
    });
    const fixture = TestBed.createComponent(ConfirmationDialogComponent);
    fixture.detectChanges();
    return fixture;
  }

  const base: ConfirmationDialogContext = { title: 'Delete Space', content: 'Are you sure?' };

  it('exposes the injected dialog context', () => {
    const fixture = setup(base);

    expect(fixture.componentInstance.context).toEqual(base);
  });

  it('renders the title and content', () => {
    const fixture = setup(base);

    expect(fixture.nativeElement.textContent).toContain('Delete Space');
    expect(fixture.nativeElement.textContent).toContain('Are you sure?');
  });

  it('closes with true when confirmed', () => {
    const fixture = setup(base);

    fixture.componentInstance.confirm();

    expect(close).toHaveBeenCalledWith(true);
  });

  describe('confirming button variant', () => {
    /** Spartan calls its primary button `default`, so a caller asking for `primary` gets that. */
    it('defaults to primary when the context says nothing', () => {
      const fixture = setup(base);

      expect(fixture.componentInstance.okVariant).toBe('default');
    });

    it('stays primary when asked for primary', () => {
      const fixture = setup({ ...base, variant: 'primary' });

      expect(fixture.componentInstance.okVariant).toBe('default');
    });

    it('turns destructive when asked for destructive', () => {
      const fixture = setup({ ...base, variant: 'destructive' });

      expect(fixture.componentInstance.okVariant).toBe('destructive');
    });
  });
});
