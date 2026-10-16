import { DIALOG_DATA } from '@angular/cdk/dialog';
import { TestBed } from '@angular/core/testing';
import { AssetFile, AssetKind } from '@localess/shared';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { vi } from 'vitest';

import { ImagePreviewDialogContext } from './image-preview-dialog.model';
import { ImagePreviewDialogComponent } from './image-preview-dialog.component';

describe('ImagePreviewDialogComponent', () => {
  /**
   * The component itself never closes with a result, but the template's `hlmDialogClose` on the
   * Close button injects the ref, so the spec still has to provide one.
   */
  it('exposes the injected dialog context', () => {
    const context: ImagePreviewDialogContext = {
      spaceId: 'space-1',
      asset: { id: 'a1', kind: AssetKind.FILE, name: 'photo', type: 'image/png' } as AssetFile,
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: DIALOG_DATA, useValue: context },
        { provide: BrnDialogRef, useValue: { close: vi.fn() } },
      ],
    });

    const fixture = TestBed.createComponent(ImagePreviewDialogComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.context).toEqual(context);
  });

  it('keeps the picture within the window, so the caption and Close stay on screen', () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: DIALOG_DATA,
          useValue: { spaceId: 'space-1', asset: { id: 'a1', kind: AssetKind.FILE, name: 'photo', type: 'image/png' } as AssetFile },
        },
        { provide: BrnDialogRef, useValue: { close: vi.fn() } },
      ],
    });

    const fixture = TestBed.createComponent(ImagePreviewDialogComponent);
    fixture.detectChanges();

    const classes = (fixture.nativeElement as HTMLElement).querySelector('img')!.className.split(/\s+/);
    // A fixed minimum (`min-h-[800px]`) wins over the maximum and overflows a smaller window.
    expect(classes).toContain('min-h-[min(800px,calc(100vh-180px))]');
    expect(classes).toContain('min-w-[min(800px,calc(100vw-180px))]');
    expect(classes.filter(it => /^min-[hw]-\[\d+px\]$/.test(it))).toEqual([]);
  });

  it('is named after the file (a visually hidden title), and so is the picture', () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: DIALOG_DATA,
          useValue: {
            spaceId: 'space-1',
            asset: { id: 'a1', kind: AssetKind.FILE, name: 'photo', extension: '.png', type: 'image/png' } as AssetFile,
          },
        },
        { provide: BrnDialogRef, useValue: { close: vi.fn() } },
      ],
    });

    const fixture = TestBed.createComponent(ImagePreviewDialogComponent);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const title = element.querySelector('h2')!;
    expect(title.textContent?.trim()).toBe('photo.png');
    expect(title.classList).toContain('sr-only');
    // The dialog's aria-labelledby points at the title's id.
    expect(title.id).toBeTruthy();
    expect(element.querySelector('img')!.getAttribute('alt')).toBe('photo.png');
  });
});
