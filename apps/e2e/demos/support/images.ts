import { deflateSync } from 'node:zlib';

type Rgb = [number, number, number];

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(data: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of data) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/** An RGB PNG from a pixel function. */
function png(width: number, height: number, pixel: (x: number, y: number) => Rgb): Buffer {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (width * 3 + 1);
    raw[row] = 0;
    for (let x = 0; x < width; x++) {
      const [r, g, b] = pixel(x, y);
      raw.set([r, g, b], row + 1 + x * 3);
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 6 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const mix = (a: Rgb, b: Rgb, t: number): Rgb => [0, 1, 2].map(i => Math.round(a[i] + (b[i] - a[i]) * t)) as Rgb;

/** A landscape: a sky gradient, a sun or moon, two hill layers. */
function landscape(sky: [Rgb, Rgb], sun: Rgb, hills: [Rgb, Rgb], width = 960, height = 640): Buffer {
  return png(width, height, (x, y) => {
    const u = x / width;
    const v = y / height;
    const far = 0.62 + 0.07 * Math.sin(u * 7.5 + 1) + 0.03 * Math.sin(u * 23);
    const near = 0.76 + 0.06 * Math.sin(u * 4.2 + 2.4) + 0.02 * Math.sin(u * 17 + 1);
    if (v > near) return mix(hills[1], [0, 0, 0], (v - near) * 0.6);
    if (v > far) return mix(hills[0], hills[1], (v - far) * 1.5);
    const sunDistance = Math.hypot(u - 0.68, (v - 0.36) * (height / width));
    if (sunDistance < 0.07) return sun;
    const glow = Math.max(0, 0.25 - sunDistance) * 2;
    return mix(mix(sky[0], sky[1], v / far), sun, glow);
  });
}

export const DEMO_IMAGES = {
  'mountain-sunrise.png': () =>
    landscape(
      [
        [255, 183, 94],
        [255, 112, 89],
      ],
      [255, 244, 214],
      [
        [122, 74, 121],
        [58, 37, 76],
      ],
    ),
  'alpine-lake.png': () =>
    landscape(
      [
        [120, 196, 255],
        [204, 236, 255],
      ],
      [255, 255, 240],
      [
        [72, 140, 120],
        [28, 82, 74],
      ],
    ),
  'desert-dunes.png': () =>
    landscape(
      [
        [250, 210, 140],
        [255, 236, 190],
      ],
      [255, 250, 230],
      [
        [219, 150, 82],
        [176, 102, 52],
      ],
    ),
  'night-hills.png': () =>
    landscape(
      [
        [18, 26, 66],
        [64, 54, 120],
      ],
      [236, 240, 255],
      [
        [46, 52, 96],
        [16, 20, 44],
      ],
    ),
  'forest-morning.png': () =>
    landscape(
      [
        [182, 226, 205],
        [240, 248, 230],
      ],
      [255, 252, 225],
      [
        [64, 128, 76],
        [24, 72, 44],
      ],
    ),
};

export function demoImage(name: keyof typeof DEMO_IMAGES): { name: string; mimeType: string; buffer: Buffer } {
  return { name, mimeType: 'image/png', buffer: DEMO_IMAGES[name]() };
}
