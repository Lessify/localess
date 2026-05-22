import { afterNextRender, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject, viewChild } from '@angular/core';

@Component({
  selector: 'll-dot-pattern',
  templateUrl: './dot-pattern.component.html',
  styleUrls: ['./dot-pattern.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DotPatternComponent {
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

    const SPACING = 24; // grid cell size in px
    const RADIUS = 1.5; // dot radius in px
    const HUE = 238; // indigo

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

    const draw = () => {
      t++;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      // Max distance from center to corner — used to normalise the radial fade
      const maxDist = Math.hypot(cx, cy);

      const cols = Math.ceil(w / SPACING) + 1;
      const rows = Math.ceil(h / SPACING) + 1;

      // Offset so the grid is centred
      const offsetX = (w - (cols - 1) * SPACING) / 2;
      const offsetY = (h - (rows - 1) * SPACING) / 2;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = offsetX + c * SPACING;
          const y = offsetY + r * SPACING;

          const dist = Math.hypot(x - cx, y - cy);
          // Radial vignette: 1 at center, 0 at corners
          const radialFade = Math.max(0, 1 - dist / maxDist);
          // Slow outward ripple wave
          const wave = 0.5 + 0.5 * Math.sin(t * 0.018 - dist * 0.045);
          const opacity = radialFade * radialFade * (0.25 + 0.35 * wave);

          if (opacity < 0.01) continue;

          ctx.beginPath();
          ctx.arc(x, y, RADIUS, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${HUE}, 75%, 68%, ${opacity.toFixed(4)})`;
          ctx.fill();
        }
      }

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
