import { afterNextRender, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject, viewChild } from '@angular/core';

@Component({
  selector: 'll-beams',
  templateUrl: './beams.component.html',
  styleUrls: ['./beams.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BeamsComponent {
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

    type Beam = {
      x: number;
      angle: number;
      width: number;
      hue: number;
      phase: number;
      speed: number;
      drift: number;
    };

    const NUM_BEAMS = 10;
    let w = 0,
      h = 0,
      frameId = 0,
      t = 0;
    let beams: Beam[] = [];

    const mkBeam = (): Beam => ({
      x: Math.random() * 1.4 - 0.2, // fractional x across canvas (slightly off-edges)
      angle: -0.35 + (Math.random() - 0.5) * 0.25, // near-vertical tilt, slight fan
      width: 60 + Math.random() * 120,
      hue: 210 + Math.random() * 60, // blue (210) → purple (270)
      phase: Math.random() * Math.PI * 2,
      speed: 0.003 + Math.random() * 0.004, // opacity pulse rate
      drift: (Math.random() - 0.5) * 0.00015, // slow horizontal drift
    });

    const resize = () => {
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = w;
      canvas.height = h;
      beams = Array.from({ length: NUM_BEAMS }, mkBeam);
    };

    const draw = () => {
      t++;

      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, w, h);

      for (const b of beams) {
        b.x += b.drift;
        // Wrap beam when it drifts fully off either edge
        if (b.x > 1.2) b.x = -0.2;
        if (b.x < -0.2) b.x = 1.2;

        const cx = b.x * w;
        const opacity = 0.08 + 0.12 * (0.5 + 0.5 * Math.sin(t * b.speed + b.phase));

        // Beam is a tall rotated rectangle drawn as a transformed gradient strip
        ctx.save();
        ctx.translate(cx, h / 2);
        ctx.rotate(b.angle);

        const halfW = b.width / 2;
        const len = Math.hypot(w, h) * 1.2; // long enough to cover rotated canvas

        const grd = ctx.createLinearGradient(-halfW, 0, halfW, 0);
        grd.addColorStop(0, 'transparent');
        grd.addColorStop(0.35, `hsla(${b.hue}, 80%, 65%, ${(opacity * 0.4).toFixed(4)})`);
        grd.addColorStop(0.5, `hsla(${b.hue}, 85%, 72%, ${opacity.toFixed(4)})`);
        grd.addColorStop(0.65, `hsla(${b.hue}, 80%, 65%, ${(opacity * 0.4).toFixed(4)})`);
        grd.addColorStop(1, 'transparent');

        ctx.fillStyle = grd;
        ctx.fillRect(-halfW, -len / 2, b.width, len);

        ctx.restore();
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
