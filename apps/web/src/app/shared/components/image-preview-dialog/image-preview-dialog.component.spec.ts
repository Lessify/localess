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

  it('shows the preview of an image, from the App API', () => {
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

    expect((fixture.nativeElement as HTMLElement).querySelector('img')!.getAttribute('src')).toBe(
      '/api/app/spaces/space-1/assets/a1/preview',
    );
  });

  describe('a video', () => {
    const render = () => {
      TestBed.configureTestingModule({
        providers: [
          {
            provide: DIALOG_DATA,
            useValue: {
              spaceId: 'space-1',
              asset: { id: 'v1', kind: AssetKind.FILE, name: 'clip', extension: '.mp4', type: 'video/mp4' } as AssetFile,
            },
          },
          { provide: BrnDialogRef, useValue: { close: vi.fn() } },
        ],
      });
      const fixture = TestBed.createComponent(ImagePreviewDialogComponent);
      fixture.detectChanges();
      return fixture;
    };

    it('shows only its thumbnail and a Play button until played, so opening the dialog loads nothing of the file', () => {
      const element = render().nativeElement as HTMLElement;
      expect(element.querySelector('video')).toBeNull();
      const play = element.querySelector('button[aria-label="Play clip.mp4"]')!;
      expect(play.querySelector('img')!.getAttribute('src')).toBe('/api/app/spaces/space-1/assets/v1/thumbnail');
    });

    it('streams from the stored file once Play is pressed, and starts at once', () => {
      const fixture = render();
      const element = fixture.nativeElement as HTMLElement;
      element.querySelector<HTMLButtonElement>('button[aria-label="Play clip.mp4"]')!.click();
      fixture.detectChanges();

      const video = element.querySelector('video')!;
      expect(video.getAttribute('src')).toBe('/api/app/spaces/space-1/assets/v1/original');
      expect(video.getAttribute('poster')).toBe('/api/app/spaces/space-1/assets/v1/thumbnail');
      expect(video.hasAttribute('controls')).toBe(true);
      expect(video.hasAttribute('autoplay')).toBe(true);
      expect(video.getAttribute('aria-label')).toBe('clip.mp4');
      expect(element.querySelector('button[aria-label="Play clip.mp4"]')).toBeNull();
    });

    it('falls back to its picture and a download link when the browser cannot play it', () => {
      const fixture = render();
      const element = fixture.nativeElement as HTMLElement;
      element.querySelector<HTMLButtonElement>('button[aria-label="Play clip.mp4"]')!.click();
      fixture.detectChanges();
      element.querySelector('video')!.dispatchEvent(new Event('error'));
      fixture.detectChanges();

      expect(element.querySelector('video')).toBeNull();
      expect(element.querySelector('img')!.getAttribute('src')).toBe('/api/app/spaces/space-1/assets/v1/thumbnail');
      expect(element.querySelector('[role="status"]')!.textContent).toContain("can't be played in your browser");
      expect(element.querySelector('a')!.getAttribute('href')).toBe('/api/app/spaces/space-1/assets/v1/download');
    });
  });
});
