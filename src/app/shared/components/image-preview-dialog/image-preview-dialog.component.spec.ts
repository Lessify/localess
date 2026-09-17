import { DIALOG_DATA } from '@angular/cdk/dialog';
import { TestBed } from '@angular/core/testing';
import { AssetFile, AssetKind } from '@shared/models/asset.model';
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
});
