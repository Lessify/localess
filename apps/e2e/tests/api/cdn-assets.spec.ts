import { expect, test } from '../support/fixtures';
import { PNG_1X1, pngFile } from '../support/files';

test.describe('CDN API → assets', () => {
  test('serves an uploaded file: original bytes, a download and a transformed image @smoke', async ({ api, space, request }) => {
    const asset = await api.uploadAsset(space.id, pngFile('logo.png'));
    expect(asset).toMatchObject({ name: 'logo', extension: '.png' });
    const base = `/api/v1/spaces/${space.id}/assets/${asset.id}`;

    const original = await request.get(`${base}/original`);
    expect(original.status()).toBe(200);
    expect(Buffer.compare(await original.body(), PNG_1X1)).toBe(0);

    const download = await request.get(`${base}/download`);
    expect(download.headers()['content-disposition']).toContain('attachment');

    const resized = await request.get(`${base}?w=10&f=webp`);
    expect(resized.status()).toBe(200);
    expect(resized.headers()['content-type']).toContain('image/');
  });

  test('answers 404 for an unknown asset', async ({ space, request }) => {
    const response = await request.get(`/api/v1/spaces/${space.id}/assets/0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b/original`);
    expect(response.status()).toBe(404);
  });
});
