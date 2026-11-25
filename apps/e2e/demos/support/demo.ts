import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { test as base } from '@playwright/test';

import { AppApi } from '../../tests/support/app-api';
import { CURSOR_SCRIPT, Director } from './director';

/** The demo server's admin (playwright.demos.config.ts seeds it), shown in the app's user menu. */
export const DEMO_ADMIN = { email: 'alex.morgan@acme.com', password: 'acme-demo-password', displayName: 'Alex Morgan' } as const;

export const DEMO_STATE = resolve(import.meta.dirname, '../../.auth/demo.json');

/** Where the finished videos go, named after the demo (`translations.webm`, ...). */
export const VIDEO_DIR = resolve(import.meta.dirname, '../../demo-videos');

export interface DemoSpace {
  id: string;
  name: string;
}

interface Fixtures {
  api: AppApi;
  /** A fresh "Acme Website" space with English (default), German and French. */
  space: DemoSpace;
  director: Director;
  /** The file name of the video (without extension); set by each demo. */
  videoName: string;
}

export const demo = base.extend<Fixtures>({
  videoName: ['demo', { option: true }],

  context: async ({ context, baseURL }, use) => {
    await context.addInitScript(CURSOR_SCRIPT);
    // Only the app: no release check against GitHub, no fonts from Google (offline, like the tests).
    await context.route(/^https?:\/\//, route =>
      route.request().url().startsWith(baseURL!) ? route.continue() : route.abort('internetdisconnected'),
    );
    await use(context);
  },

  api: async ({ playwright, baseURL }, use) => {
    const request = await playwright.request.newContext({ baseURL, storageState: DEMO_STATE });
    await use(new AppApi(request));
    await request.dispose();
  },

  space: async ({ api }, use) => {
    const space = await api.createSpace('Acme Website');
    await api.addLocale(space.id, 'de');
    await api.addLocale(space.id, 'fr');
    await use(space);
    await api.deleteSpace(space.id);
  },

  director: async ({ page, videoName }, use) => {
    await use(new Director(page));
    // The video is complete once the page is closed.
    const video = page.video();
    await page.close();
    if (video) {
      mkdirSync(VIDEO_DIR, { recursive: true });
      const webm = resolve(VIDEO_DIR, `${videoName}.webm`);
      await video.saveAs(webm);
      toMp4AndPoster(webm);
    }
  },
});

/**
 * With ffmpeg installed: an H.264 MP4 next to the WebM (for browsers without VP9, e.g. older Safari) and a poster image
 * from the title card. Without it, only the WebM.
 */
function toMp4AndPoster(webm: string): void {
  const base = webm.replace(/\.webm$/, '');
  const quiet = ['-hide_banner', '-loglevel', 'error', '-y'];
  try {
    execFileSync('ffmpeg', [
      ...quiet,
      '-i',
      webm,
      '-c:v',
      'libx264',
      '-preset',
      'slow',
      '-crf',
      '20',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      `${base}.mp4`,
    ]);
    execFileSync('ffmpeg', [...quiet, '-ss', '1.5', '-i', webm, '-frames:v', '1', '-q:v', '2', `${base}-poster.jpg`]);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}

export { expect } from '@playwright/test';
