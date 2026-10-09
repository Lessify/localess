import { afterNextRender, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject, viewChild } from '@angular/core';

@Component({
  selector: 'll-prism',
  templateUrl: './prism.component.html',
  styleUrls: ['./prism.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrismComponent {
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

    type Band = {
      angle: number; // current rotation angle (radians)
      rotSpeed: number; // radians per frame
      hueOffset: number; // starting hue for this band's spectrum
      hueSpeed: number; // hue drift speed per frame
      alpha: number; // opacity (applied in screen mode)
    };

    // 5 spectral bands — each covers the full visible spectrum with a unique phase and rotation
    const BANDS: Band[] = [
      { angle: 0.0, rotSpeed: 0.00028, hueOffset: 0, hueSpeed: 0.035, alpha: 0.82 },
      { angle: Math.PI / 5, rotSpeed: -0.00021, hueOffset: 72, hueSpeed: 0.028, alpha: 0.78 },
      { angle: (2 * Math.PI) / 5, rotSpeed: 0.00017, hueOffset: 144, hueSpeed: 0.042, alpha: 0.75 },
      { angle: (3 * Math.PI) / 5, rotSpeed: -0.00033, hueOffset: 216, hueSpeed: 0.031, alpha: 0.76 },
      { angle: (4 * Math.PI) / 5, rotSpeed: 0.00024, hueOffset: 288, hueSpeed: 0.037, alpha: 0.72 },
    ];

    const SPECTRUM_STOPS = 13; // colour stops per band gradient

    let w = 0,
      h = 0,
      frameId = 0;

    const resize = () => {
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = w;
      canvas.height = h;
    };

    // Build a linear gradient that sweeps the full visible spectrum, offset by hueOffset
    const spectrumGradient = (diag: number, hueOffset: number): CanvasGradient => {
      const grad = ctx.createLinearGradient(-diag, 0, diag, 0);
      for (let i = 0; i <= SPECTRUM_STOPS; i++) {
        const hue = (hueOffset + (i / SPECTRUM_STOPS) * 360) % 360;
        // Saturation and lightness tuned so screen blending stays punchy but not blown-out
        grad.addColorStop(i / SPECTRUM_STOPS, `hsl(${hue.toFixed(1)}, 95%, 52%)`);
      }
      return grad;
    };

    const draw = () => {
      // Pure black base — screen blend adds light, so we need black to start dark
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const diag = Math.hypot(w, h) * 0.65; // half-length of each gradient strip

      ctx.globalCompositeOperation = 'screen';

      for (const b of BANDS) {
        b.angle += b.rotSpeed;
        b.hueOffset = (b.hueOffset + b.hueSpeed) % 360;

        ctx.save();
        ctx.globalAlpha = b.alpha;
        ctx.translate(cx, cy);
        ctx.rotate(b.angle);

        ctx.fillStyle = spectrumGradient(diag, b.hueOffset);
        // Tall enough to fill the canvas regardless of rotation
        ctx.fillRect(-diag, -Math.hypot(w, h), diag * 2, Math.hypot(w, h) * 2);

        ctx.restore();
      }

      ctx.globalCompositeOperation = 'source-over';

      // Central glow — simulates the bright point where light enters the prism
      const glowR = Math.min(w, h) * 0.22;
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
      glow.addColorStop(0, 'rgba(255, 255, 255, 0.06)');
      glow.addColorStop(0.35, 'rgba(200, 200, 255, 0.03)');
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.fillRect(cx - glowR, cy - glowR, glowR * 2, glowR * 2);

      // Dark vignette to anchor the edges and deepen the colour contrast
      const vig = ctx.createRadialGradient(cx, cy, Math.min(w, h) * 0.2, cx, cy, Math.hypot(cx, cy) * 1.1);
      vig.addColorStop(0, 'transparent');
      vig.addColorStop(1, 'rgba(0, 0, 0, 0.88)');
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
