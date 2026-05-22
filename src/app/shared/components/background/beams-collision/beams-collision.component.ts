import { afterNextRender, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject, viewChild } from '@angular/core';

@Component({
  selector: 'll-beams-collision',
  templateUrl: './beams-collision.component.html',
  styleUrls: ['./beams-collision.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BeamsCollisionComponent {
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

    type Beam = { x: number; y: number; speed: number; tailLen: number; width: number; hue: number; countdown: number };
    type Particle = { x: number; y: number; vx: number; vy: number; life: number; decay: number; size: number; hue: number };
    type Glow = { x: number; life: number };

    const NUM_BEAMS = 12;
    const PARTICLES_PER_HIT = 16;
    const MAX_PARTICLES = 250;

    let w = 0,
      h = 0,
      frameId = 0;
    let beams: Beam[] = [];
    const particles: Particle[] = [];
    const glows: Glow[] = [];

    // ── Beam factory ───────────────────────────────────────────────────────
    const mkBeam = (i: number): Beam => {
      const slot = w / NUM_BEAMS;
      const tailLen = 80 + Math.random() * 120;
      return {
        x: Math.max(2, Math.min(w - 2, slot * (i + 0.5) + (Math.random() - 0.5) * slot * 0.5)),
        y: -tailLen + Math.random() * h * 0.85, // spread across upper 85% for immediate fill
        speed: 1.5 + Math.random() * 3.5,
        tailLen,
        width: 1 + Math.random(),
        hue: 240 + Math.random() * 45, // indigo (240) → purple (285)
        countdown: 0,
      };
    };

    // ── Explosion ──────────────────────────────────────────────────────────
    const explode = (x: number, hue: number) => {
      glows.push({ x, life: 1 });
      for (let i = 0; i < PARTICLES_PER_HIT; i++) {
        const angle = Math.random() * Math.PI; // upper semicircle
        const spd = Math.random() * 4 + 0.5;
        particles.push({
          x,
          y: h,
          vx: Math.cos(angle) * spd * (Math.random() > 0.5 ? 1 : -1),
          vy: -(Math.sin(angle) * spd + 0.4),
          life: 0.75 + Math.random() * 0.25,
          decay: 0.014 + Math.random() * 0.02,
          size: 0.5 + Math.random() * 2,
          hue: hue + Math.random() * 30 - 15,
        });
      }
      if (particles.length > MAX_PARTICLES) particles.splice(0, particles.length - MAX_PARTICLES);
    };

    // ── Resize ─────────────────────────────────────────────────────────────
    const resize = () => {
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = w;
      canvas.height = h;
      beams = Array.from({ length: NUM_BEAMS }, (_, i) => mkBeam(i));
    };

    // ── Draw loop ──────────────────────────────────────────────────────────
    const draw = () => {
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, w, h);

      // Beams
      for (const b of beams) {
        if (b.countdown > 0) {
          b.countdown--;
          continue;
        }

        b.y += b.speed;

        if (b.y >= h) {
          explode(b.x, b.hue);
          b.tailLen = 80 + Math.random() * 120;
          b.y = -b.tailLen;
          b.speed = 1.5 + Math.random() * 3.5;
          b.countdown = Math.floor(Math.random() * 100 + 20);
          continue;
        }

        const yTop = b.y - b.tailLen;
        const grd = ctx.createLinearGradient(0, yTop, 0, b.y);
        grd.addColorStop(0, 'transparent');
        grd.addColorStop(0.65, `hsla(${b.hue}, 75%, 65%, 0.45)`);
        grd.addColorStop(1, `hsla(${b.hue}, 85%, 78%, 0.95)`);
        ctx.fillStyle = grd;
        ctx.fillRect(b.x - b.width / 2, yTop, b.width, b.tailLen);

        // Tip glow
        const tg = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, 9);
        tg.addColorStop(0, `hsla(${b.hue}, 90%, 88%, 0.55)`);
        tg.addColorStop(1, 'transparent');
        ctx.fillStyle = tg;
        ctx.fillRect(b.x - 9, b.y - 9, 18, 18);
      }

      // Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.09; // gravity
        p.life -= p.decay;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        ctx.fillStyle = `hsla(${p.hue}, 80%, 72%, ${p.life.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.1, p.size * p.life), 0, Math.PI * 2);
        ctx.fill();
      }

      // Collision glows
      for (let i = glows.length - 1; i >= 0; i--) {
        const g = glows[i];
        const r = 90 * g.life;
        const gg = ctx.createRadialGradient(g.x, h, 0, g.x, h, r);
        gg.addColorStop(0, `rgba(170, 130, 255, ${(g.life * 0.55).toFixed(3)})`);
        gg.addColorStop(0.5, `rgba(120, 80, 220, ${(g.life * 0.25).toFixed(3)})`);
        gg.addColorStop(1, 'transparent');
        ctx.fillStyle = gg;
        ctx.fillRect(g.x - r, h - r, r * 2, r);
        g.life -= 0.045;
        if (g.life <= 0) glows.splice(i, 1);
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
