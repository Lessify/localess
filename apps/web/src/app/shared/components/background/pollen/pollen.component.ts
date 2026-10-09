import { afterNextRender, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject, viewChild } from '@angular/core';

@Component({
  selector: 'll-pollen',
  templateUrl: './pollen.component.html',
  styleUrls: ['./pollen.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PollenComponent {
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

    type Grain = {
      x: number;
      y: number;
      r: number; // core radius
      vx: number; // base horizontal drift
      vy: number; // upward drift speed
      hue: number; // 36–62 — golden yellow → warm amber
      sat: number; // saturation
      alpha: number; // base opacity
      phase: number; // current oscillation phase
      phaseSpeed: number; // oscillation frequency
      amplitude: number; // horizontal oscillation width
    };

    const NUM = 95;

    let w = 0,
      h = 0,
      frameId = 0;
    let grains: Grain[] = [];

    const mkGrain = (randomY = false): Grain => ({
      x: Math.random() * w,
      y: randomY ? Math.random() * h : h + 10 + Math.random() * 60,
      r: 1.5 + Math.random() * Math.random() * 6, // skewed toward small
      vx: (Math.random() - 0.5) * 0.25,
      vy: 0.18 + Math.random() * 0.42,
      hue: 36 + Math.random() * 26,
      sat: 72 + Math.random() * 28,
      alpha: 0.22 + Math.random() * 0.65,
      phase: Math.random() * Math.PI * 2,
      phaseSpeed: 0.007 + Math.random() * 0.013,
      amplitude: 0.25 + Math.random() * 1.1,
    });

    const resize = () => {
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = w;
      canvas.height = h;
      grains = Array.from({ length: NUM }, () => mkGrain(true));
    };

    const draw = () => {
      ctx.fillStyle = '#0a0905';
      ctx.fillRect(0, 0, w, h);

      for (const g of grains) {
        g.phase += g.phaseSpeed;
        g.x += g.vx + Math.sin(g.phase) * g.amplitude;
        g.y -= g.vy;

        // Wrap horizontally with a small margin
        if (g.x < -20) g.x = w + 20;
        if (g.x > w + 20) g.x = -20;

        // Reset when it floats off the top
        if (g.y < -g.r * 6) {
          Object.assign(g, mkGrain(false));
        }

        const glowR = g.r * 4.5;

        // Outer soft glow
        const glow = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, glowR);
        glow.addColorStop(0, `hsla(${g.hue}, ${g.sat}%, 72%, ${g.alpha.toFixed(3)})`);
        glow.addColorStop(0.3, `hsla(${g.hue}, ${g.sat}%, 62%, ${(g.alpha * 0.5).toFixed(3)})`);
        glow.addColorStop(0.65, `hsla(${g.hue - 5}, ${g.sat - 10}%, 48%, ${(g.alpha * 0.15).toFixed(3)})`);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.fillRect(g.x - glowR, g.y - glowR, glowR * 2, glowR * 2);

        // Solid core for larger grains so they read as distinct particles
        if (g.r > 2.5) {
          ctx.beginPath();
          ctx.arc(g.x, g.y, g.r * 0.55, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${g.hue}, ${g.sat}%, 85%, ${(g.alpha * 0.9).toFixed(3)})`;
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
