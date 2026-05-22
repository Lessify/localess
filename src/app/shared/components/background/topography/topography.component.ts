import { afterNextRender, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject, viewChild } from '@angular/core';

@Component({
  selector: 'll-topography',
  templateUrl: './topography.component.html',
  styleUrls: ['./topography.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopographyComponent {
  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      const canvas = this.canvasRef()?.nativeElement;
      if (canvas) this.init(canvas);
    });
  }

  private init(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // --- Perlin noise ---
    const table = (() => {
      const arr = Array.from({ length: 256 }, (_, i) => i);
      for (let i = 255; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return [...arr, ...arr];
    })();

    const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
    const lerp = (t: number, a: number, b: number) => a + t * (b - a);
    const grad = (hash: number, x: number, y: number, z: number) => {
      const h = hash & 15;
      const u = h < 8 ? x : y;
      const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
      return (h & 1 ? -u : u) + (h & 2 ? -v : v);
    };
    const noise = (x: number, y: number, z: number): number => {
      const xi = Math.floor(x) & 255;
      const yi = Math.floor(y) & 255;
      const zi = Math.floor(z) & 255;
      const xf = x - Math.floor(x);
      const yf = y - Math.floor(y);
      const zf = z - Math.floor(z);
      const u = fade(xf),
        v = fade(yf),
        w = fade(zf);
      const aaa = table[table[table[xi] + yi] + zi];
      const aba = table[table[table[xi] + yi + 1] + zi];
      const aab = table[table[table[xi] + yi] + zi + 1];
      const abb = table[table[table[xi] + yi + 1] + zi + 1];
      const baa = table[table[table[xi + 1] + yi] + zi];
      const bba = table[table[table[xi + 1] + yi + 1] + zi];
      const bab = table[table[table[xi + 1] + yi] + zi + 1];
      const bbb = table[table[table[xi + 1] + yi + 1] + zi + 1];
      const x1 = lerp(u, grad(aaa, xf, yf, zf), grad(baa, xf - 1, yf, zf));
      const x2 = lerp(u, grad(aba, xf, yf - 1, zf), grad(bba, xf - 1, yf - 1, zf));
      const y1 = lerp(v, x1, x2);
      const x3 = lerp(u, grad(aab, xf, yf, zf - 1), grad(bab, xf - 1, yf, zf - 1));
      const x4 = lerp(u, grad(abb, xf, yf - 1, zf - 1), grad(bbb, xf - 1, yf - 1, zf - 1));
      const y2 = lerp(v, x3, x4);
      return (lerp(w, y1, y2) + 1) * 0.5; // normalize to [0, 1]
    };

    // --- State ---
    const CELL = 10;
    const LEVELS = 10;
    const SCALE = 0.03;

    let w = 0,
      h = 0,
      cols = 0,
      rows = 0;
    let t = 0,
      frameId = 0;
    let grid = new Float32Array(0);

    const resize = () => {
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = w;
      canvas.height = h;
      cols = Math.ceil(w / CELL) + 1;
      rows = Math.ceil(h / CELL) + 1;
      grid = new Float32Array((cols + 1) * (rows + 1));
    };

    resize();

    // Inline moveTo/lineTo to avoid closure allocation per segment
    const seg = (x1: number, y1: number, x2: number, y2: number) => {
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
    };

    // Clamped interpolation weight (avoids NaN when two corners are equal)
    const edgeT = (threshold: number, a: number, b: number) => {
      const d = b - a;
      return d === 0 ? 0.5 : (threshold - a) / d;
    };

    const draw = () => {
      // Build noise grid
      const stride = cols + 1;
      for (let r = 0; r <= rows; r++) {
        for (let c = 0; c <= cols; c++) {
          grid[r * stride + c] = noise(c * SCALE, r * SCALE, t);
        }
      }

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#050b14';
      ctx.fillRect(0, 0, w, h);

      // Draw each contour level using marching squares
      for (let lvl = 0; lvl < LEVELS; lvl++) {
        const threshold = (lvl + 1) / (LEVELS + 1);
        const alpha = 0.08 + (lvl / LEVELS) * 0.38;
        ctx.strokeStyle = `rgba(0, 61, 255, ${alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const tl = grid[r * stride + c];
            const tr = grid[r * stride + c + 1];
            const bl = grid[(r + 1) * stride + c];
            const br = grid[(r + 1) * stride + c + 1];

            const bits = (tl > threshold ? 8 : 0) | (tr > threshold ? 4 : 0) | (br > threshold ? 2 : 0) | (bl > threshold ? 1 : 0);

            if (bits === 0 || bits === 15) continue;

            const x0 = c * CELL,
              y0 = r * CELL;

            const ttop = edgeT(threshold, tl, tr);
            const tright = edgeT(threshold, tr, br);
            const tbot = edgeT(threshold, bl, br);
            const tleft = edgeT(threshold, tl, bl);

            const topX = x0 + ttop * CELL,
              topY = y0;
            const rightX = x0 + CELL,
              rightY = y0 + tright * CELL;
            const botX = x0 + tbot * CELL,
              botY = y0 + CELL;
            const leftX = x0,
              leftY = y0 + tleft * CELL;

            switch (bits) {
              case 1:
                seg(leftX, leftY, botX, botY);
                break;
              case 2:
                seg(botX, botY, rightX, rightY);
                break;
              case 3:
                seg(leftX, leftY, rightX, rightY);
                break;
              case 4:
                seg(topX, topY, rightX, rightY);
                break;
              case 5: {
                const mid = (tl + tr + br + bl) * 0.25;
                if (mid > threshold) {
                  seg(topX, topY, leftX, leftY);
                  seg(botX, botY, rightX, rightY);
                } else {
                  seg(topX, topY, rightX, rightY);
                  seg(botX, botY, leftX, leftY);
                }
                break;
              }
              case 6:
                seg(topX, topY, botX, botY);
                break;
              case 7:
                seg(topX, topY, leftX, leftY);
                break;
              case 8:
                seg(topX, topY, leftX, leftY);
                break;
              case 9:
                seg(topX, topY, botX, botY);
                break;
              case 10: {
                const mid = (tl + tr + br + bl) * 0.25;
                if (mid > threshold) {
                  seg(topX, topY, rightX, rightY);
                  seg(botX, botY, leftX, leftY);
                } else {
                  seg(topX, topY, leftX, leftY);
                  seg(botX, botY, rightX, rightY);
                }
                break;
              }
              case 11:
                seg(topX, topY, rightX, rightY);
                break;
              case 12:
                seg(leftX, leftY, rightX, rightY);
                break;
              case 13:
                seg(botX, botY, rightX, rightY);
                break;
              case 14:
                seg(leftX, leftY, botX, botY);
                break;
            }
          }
        }

        ctx.stroke();
      }

      t += 0.001;
      frameId = requestAnimationFrame(draw);
    };

    const ro = new ResizeObserver(() => resize());
    ro.observe(canvas.parentElement!);
    draw();

    this.destroyRef.onDestroy(() => {
      cancelAnimationFrame(frameId);
      ro.disconnect();
    });
  }
}
