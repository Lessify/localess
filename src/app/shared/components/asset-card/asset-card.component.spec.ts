import { TestBed } from '@angular/core/testing';
import { Timestamp } from '@angular/fire/firestore';
import { Asset, AssetFile, AssetFolder, AssetKind } from '@shared/models/asset.model';
import { vi } from 'vitest';

import { AssetCardComponent } from './asset-card.component';

const updatedAt = { toDate: () => new Date('2024-01-01T00:00:00Z') } as unknown as Timestamp;

function file(overrides: Partial<AssetFile> = {}): AssetFile {
  return {
    id: 'f1',
    kind: AssetKind.FILE,
    name: 'photo',
    extension: '.png',
    type: 'image/png',
    size: 1024,
    parentPath: '',
    createdAt: updatedAt,
    updatedAt,
    ...overrides,
  } as AssetFile;
}

function folder(overrides: Partial<AssetFolder> = {}): AssetFolder {
  return {
    id: 'd1',
    kind: AssetKind.FOLDER,
    name: 'Documents',
    parentPath: '',
    createdAt: updatedAt,
    updatedAt,
    ...overrides,
  } as AssetFolder;
}

describe('AssetCardComponent', () => {
  function setup(item: Asset, options: { zoomCursor?: boolean; showFooter?: boolean } = {}) {
    TestBed.configureTestingModule({});
    const fixture = TestBed.createComponent(AssetCardComponent);
    fixture.componentRef.setInput('item', item);
    fixture.componentRef.setInput('spaceId', 'space-1');
    fixture.componentRef.setInput('zoomCursor', options.zoomCursor ?? false);
    if (options.showFooter !== undefined) {
      fixture.componentRef.setInput('showFooter', options.showFooter);
    }
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  it('emits assetSelect when the preview area is clicked', () => {
    const { fixture } = setup(file());
    const spy = vi.fn();
    fixture.componentInstance.assetSelect.subscribe(spy);

    fixture.nativeElement.querySelector('.cursor-pointer').click();

    expect(spy).toHaveBeenCalledWith(file());
  });

  it('renders a folder icon for folders', () => {
    const { fixture } = setup(folder());

    expect(fixture.nativeElement.querySelector('img')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Documents');
  });

  it('renders an image preview for previewable file types', () => {
    const { fixture } = setup(file({ type: 'image/png' }));

    const img = fixture.nativeElement.querySelector('img');
    expect(img).not.toBeNull();
  });

  it('applies the zoom-in cursor when zoomCursor is true', () => {
    const { fixture } = setup(file({ type: 'image/png' }), { zoomCursor: true });
    expect(fixture.nativeElement.querySelector('img').classList).toContain('cursor-zoom-in');
  });

  it('omits the zoom-in cursor when zoomCursor is false', () => {
    const { fixture } = setup(file({ type: 'image/png' }), { zoomCursor: false });
    expect(fixture.nativeElement.querySelector('img').classList).not.toContain('cursor-zoom-in');
  });

  it('renders the footer by default', () => {
    const { fixture } = setup(file());
    expect(fixture.nativeElement.querySelector('hlm-card-footer')).not.toBeNull();
  });

  it('omits the footer when showFooter is false', () => {
    const { fixture } = setup(folder(), { showFooter: false });
    expect(fixture.nativeElement.querySelector('hlm-card-footer')).toBeNull();
  });

  it('renders a processing spinner while a file is in progress', () => {
    const { fixture } = setup(file({ inProgress: true }));

    expect(fixture.nativeElement.textContent).toContain('Processing');
  });

  it('renders a file-type icon and extension badge for non-previewable files', () => {
    const { fixture } = setup(file({ type: 'application/pdf', extension: '.pdf' }));

    expect(fixture.nativeElement.querySelector('img')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('.pdf');
  });

  it('shows the file size for files', () => {
    const { fixture } = setup(file({ size: 2048 }));

    expect(fixture.nativeElement.textContent).toContain('2');
  });
});
