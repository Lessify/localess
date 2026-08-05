import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AssetFile, AssetKind } from '@shared/models/asset.model';

import { ImagePreviewDialogModel } from './image-preview-dialog.model';
import { ImagePreviewDialogComponent } from './image-preview-dialog.component';

describe('ImagePreviewDialogComponent', () => {
  it('exposes the injected dialog data', () => {
    const data: ImagePreviewDialogModel = {
      spaceId: 'space-1',
      asset: { id: 'a1', kind: AssetKind.FILE, name: 'photo', type: 'image/png' } as AssetFile,
    };
    TestBed.configureTestingModule({ providers: [{ provide: MAT_DIALOG_DATA, useValue: data }] });

    const fixture = TestBed.createComponent(ImagePreviewDialogComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.data).toEqual(data);
  });
});
