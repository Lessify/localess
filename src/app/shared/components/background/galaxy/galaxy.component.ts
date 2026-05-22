import { afterNextRender, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject, viewChild } from '@angular/core';

@Component({
  selector: 'll-galaxy',
  templateUrl: './galaxy.component.html',
  styleUrls: ['./galaxy.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GalaxyComponent {
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

    type Star = {
      angle: number; // polar angle (radians)
      dist: number; // polar distance from centre (px)
      r: number; // dot radius
      hue: number; // most stars blue-white, some warm
      sat: number; // saturation (0 = pure white)
      phase: number; // twinkle phase offset
      twinkleSpeed: number;
    };

    type Nebula = {
      xf: number;
      yf: number; // fractional position [0, 1]
      rf: number; // radius as fraction of canvas diagonal
      hue: number;
      alpha: number;
    };

    const NUM_STARS = 500;
    const NUM_NEBULAE = 7;
    const ROT_SPEED = 0.00006; // radians per frame — slow differential rotation

    let w = 0,
      h = 0,
      frameId = 0,
      t = 0;
    let stars: Star[] = [];
    let nebulae: Nebula[] = [];
    let maxDist = 1;

    const resize = () => {
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = w;
      canvas.height = h;
      maxDist = Math.hypot(w, h) * 0.52;

      // Stars: concentrated toward centre via power distribution
      stars = Array.from({ length: NUM_STARS }, () => ({
        angle: Math.random() * Math.PI * 2,
        dist: maxDist * Math.pow(Math.random(), 0.55),
        r: 0.3 + Math.random() * Math.random() * 2.2, // skewed toward small
        hue: Math.random() < 0.72 ? 210 + Math.random() * 40 : 35 + Math.random() * 25,
        sat: Math.random() < 0.6 ? 0 : 35 + Math.random() * 35,
        phase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.012 + Math.random() * 0.022,
      }));

      // Nebulae: fixed fractional positions, re-created on resize
      nebulae = Array.from({ length: NUM_NEBULAE }, () => ({
        xf: 0.1 + Math.random() * 0.8,
        yf: 0.1 + Math.random() * 0.8,
        rf: 0.14 + Math.random() * 0.22,
        hue: 245 + Math.random() * 95, // indigo → purple → pink
        alpha: 0.025 + Math.random() * 0.055,
      }));
    };

    const draw = () => {
      t++;

      ctx.fillStyle = '#020408';
      ctx.fillRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;

      // ── Nebulae ──────────────────────────────────────────────────────────
      for (const n of nebulae) {
        const nx = n.xf * w;
        const ny = n.yf * h;
        const nr = n.rf * Math.hypot(w, h);
        const g = ctx.createRadialGradient(nx, ny, 0, nx, ny, nr);
        g.addColorStop(0, `hsla(${n.hue}, 65%, 55%, ${(n.alpha * 2.2).toFixed(4)})`);
        g.addColorStop(0.45, `hsla(${n.hue}, 60%, 40%, ${n.alpha.toFixed(4)})`);
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.fillRect(nx - nr, ny - nr, nr * 2, nr * 2);
      }

      // ── Galaxy core glow ─────────────────────────────────────────────────
      const coreR = Math.min(w, h) * 0.2;
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
      core.addColorStop(0, 'rgba(215, 225, 255, 0.28)');
      core.addColorStop(0.12, 'rgba(155, 175, 255, 0.14)');
      core.addColorStop(0.45, 'rgba(90, 110, 220, 0.05)');
      core.addColorStop(1, 'transparent');
      ctx.fillStyle = core;
      ctx.fillRect(cx - coreR, cy - coreR, coreR * 2, coreR * 2);

      // ── Stars ─────────────────────────────────────────────────────────────
      for (const s of stars) {
        // Inner stars rotate faster (differential rotation like a real galaxy)
        const distFrac = s.dist / maxDist;
        const angle = s.angle + t * ROT_SPEED * (1 + (1 - distFrac) * 0.6);
        const x = cx + Math.cos(angle) * s.dist;
        const y = cy + Math.sin(angle) * s.dist;

        const twinkle = 0.5 + 0.5 * Math.sin(t * s.twinkleSpeed + s.phase);
        // Fade stars toward outer edge
        const edgeFade = Math.max(0, 1 - distFrac * 0.85);
        const opacity = (0.45 + 0.55 * twinkle) * edgeFade;

        if (opacity < 0.04) continue;

        // Bright stars get a soft halo
        if (s.r > 1.6) {
          const haloR = s.r * 3.5;
          const halo = ctx.createRadialGradient(x, y, 0, x, y, haloR);
          halo.addColorStop(0, `hsla(${s.hue}, ${s.sat}%, 90%, ${(opacity * 0.35).toFixed(4)})`);
          halo.addColorStop(1, 'transparent');
          ctx.fillStyle = halo;
          ctx.fillRect(x - haloR, y - haloR, haloR * 2, haloR * 2);
        }

        ctx.beginPath();
        ctx.arc(x, y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${s.hue}, ${s.sat}%, 88%, ${opacity.toFixed(4)})`;
        ctx.fill();
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
