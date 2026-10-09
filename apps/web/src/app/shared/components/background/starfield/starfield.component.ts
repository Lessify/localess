import { afterNextRender, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject, viewChild } from '@angular/core';

@Component({
  selector: 'll-starfield',
  templateUrl: './starfield.component.html',
  styleUrls: ['./starfield.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StarfieldComponent {
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

    type Star = { x: number; y: number; z: number; pz: number };

    const NUM_STARS = 800;
    const MAX_Z = 1000;
    const SPEED = 4;

    let w = 0;
    let h = 0;
    let frameId = 0;

    const mkStar = (): Star => ({
      x: Math.random() * 1600 - 800,
      y: Math.random() * 900 - 450,
      z: Math.random() * MAX_Z,
      pz: MAX_Z,
    });

    const resize = () => {
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = w;
      canvas.height = h;
    };

    resize();
    const stars: Star[] = Array.from({ length: NUM_STARS }, mkStar);

    const draw = () => {
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;

      for (const s of stars) {
        s.pz = s.z;
        s.z -= SPEED;

        if (s.z <= 0) {
          Object.assign(s, mkStar());
          s.pz = s.z = MAX_Z;
          continue;
        }

        const sx = (s.x / s.z) * w + cx;
        const sy = (s.y / s.z) * h + cy;
        const px = (s.x / s.pz) * w + cx;
        const py = (s.y / s.pz) * h + cy;

        if (sx < 0 || sx > w || sy < 0 || sy > h) {
          Object.assign(s, mkStar());
          s.pz = s.z = MAX_Z;
          continue;
        }

        const alpha = 1 - s.z / MAX_Z;
        const size = Math.max(0.4, (1 - s.z / MAX_Z) * 2.5);

        ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
        ctx.lineWidth = size;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(sx, sy);
        ctx.stroke();
      }

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
