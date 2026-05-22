import { afterNextRender, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject, viewChild } from '@angular/core';

@Component({
  selector: 'll-laser-grid',
  templateUrl: './laser-grid.component.html',
  styleUrls: ['./laser-grid.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LaserGridComponent {
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

    // ── Constants ───────────────────────────────────────────────────────────
    const SCROLL_SPEED = 0.006; // grid cells per frame
    const NUM_V = 16; // vertical lines across the floor
    const NUM_H = 22; // horizontal lines in the pool at one time
    const HY_FRAC = 0.46; // horizon as fraction of canvas height
    const CYAN = 182; // hue for vertical (converging) lines
    const MAGENTA = 300; // hue for horizontal (scrolling) lines

    let w = 0,
      h = 0,
      frameId = 0,
      t = 0;

    const resize = () => {
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = w;
      canvas.height = h;
    };

    // Draw a line with a layered neon glow (thick+transparent → thin+bright)
    const neonLine = (x1: number, y1: number, x2: number, y2: number, hue: number, alpha: number) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = `hsla(${hue}, 90%, 65%, ${(alpha * 0.15).toFixed(4)})`;
      ctx.lineWidth = 7;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = `hsla(${hue}, 92%, 70%, ${(alpha * 0.35).toFixed(4)})`;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = `hsla(${hue}, 95%, 82%, ${alpha.toFixed(4)})`;
      ctx.lineWidth = 0.7;
      ctx.stroke();
    };

    const draw = () => {
      t++;

      ctx.fillStyle = '#060010';
      ctx.fillRect(0, 0, w, h);

      const cx = w / 2;
      const hy = h * HY_FRAC;
      const floorH = h - hy;
      const offset = (t * SCROLL_SPEED) % 1;

      // ── Sky ───────────────────────────────────────────────────────────────
      const sky = ctx.createLinearGradient(0, 0, 0, hy);
      sky.addColorStop(0, '#030008');
      sky.addColorStop(1, '#1a0440');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, hy);

      // ── Horizon bloom ─────────────────────────────────────────────────────
      const bloom = ctx.createRadialGradient(cx, hy, 0, cx, hy, w * 0.55);
      bloom.addColorStop(0, 'rgba(160, 50, 255, 0.55)');
      bloom.addColorStop(0.3, 'rgba(80, 20, 190, 0.2)');
      bloom.addColorStop(1, 'transparent');
      ctx.fillStyle = bloom;
      ctx.fillRect(cx - w * 0.55, hy - w * 0.3, w * 1.1, w * 0.55);

      // ── Sun ───────────────────────────────────────────────────────────────
      const sunR = Math.min(w, h) * 0.055;
      const sunY = hy + sunR * 0.1;
      const sun = ctx.createRadialGradient(cx, sunY, 0, cx, sunY, sunR * 3);
      sun.addColorStop(0, 'rgba(255, 210, 80, 1)');
      sun.addColorStop(0.18, 'rgba(255, 90, 150, 0.9)');
      sun.addColorStop(0.5, 'rgba(160, 40, 220, 0.45)');
      sun.addColorStop(1, 'transparent');
      ctx.fillStyle = sun;
      ctx.fillRect(cx - sunR * 4, sunY - sunR * 4, sunR * 8, sunR * 8);

      // ── Floor ─────────────────────────────────────────────────────────────
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, hy, w, floorH + 1);
      ctx.clip();

      const floor = ctx.createLinearGradient(0, hy, 0, h);
      floor.addColorStop(0, '#0e0028');
      floor.addColorStop(1, '#1a0045');
      ctx.fillStyle = floor;
      ctx.fillRect(0, hy, w, floorH);

      // Vertical lines — converge to vanishing point (cx, hy)
      for (let i = 0; i <= NUM_V; i++) {
        const xBot = (i / NUM_V) * w;
        const alpha = 0.45 + 0.2 * Math.sin(t * 0.018 + i * 0.45);
        neonLine(cx, hy, xBot, h, CYAN, alpha);
      }

      // Horizontal lines — scroll toward viewer using 1/z perspective
      for (let i = 0; i < NUM_H + 1; i++) {
        const z = i + 1 - offset; // z > 0: near horizon; small z: near viewer
        if (z <= 0.08) continue;

        const y = hy + floorH / z;
        if (y > h - 1 || y < hy) continue;

        const yFrac = (y - hy) / floorH; // 0 at horizon, 1 at bottom
        const xL = cx * (1 - yFrac); // left clip from vanishing point
        const xR = cx + (w - cx) * yFrac; // right clip from vanishing point
        const alpha = Math.min(0.85, yFrac * 1.2);

        if (alpha < 0.03) continue;
        neonLine(xL, y, xR, y, MAGENTA, alpha);
      }

      ctx.restore();

      // ── Horizon line ──────────────────────────────────────────────────────
      ctx.beginPath();
      ctx.moveTo(0, hy);
      ctx.lineTo(w, hy);
      ctx.strokeStyle = `hsla(${CYAN}, 95%, 80%, 0.55)`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // ── Vignette ──────────────────────────────────────────────────────────
      const vig = ctx.createRadialGradient(cx, h * 0.55, h * 0.15, cx, h * 0.55, Math.hypot(w * 0.55, h * 0.55));
      vig.addColorStop(0, 'transparent');
      vig.addColorStop(1, 'rgba(2, 0, 10, 0.82)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);

      frameId = requestAnimationFrame(draw);
    };

    const ro = new ResizeObserver(() => resize());
    ro.observe(canvas.parentElement!);
    resize();
    draw();

    this.destroyRef.onDestroy(() => {
      cancelAnimationFrame(frameId);
      ro.disconnect();
    });
  }
}
