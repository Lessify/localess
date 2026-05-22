import { afterNextRender, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject, viewChild } from '@angular/core';

@Component({
  selector: 'll-blueprint',
  templateUrl: './blueprint.component.html',
  styleUrls: ['./blueprint.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlueprintComponent {
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

    // ── Constants ──────────────────────────────────────────────────────────
    const CELL = 24; // fine grid step (px)
    const MAJOR = 120; // coarse grid step (5 × CELL)
    const DRAW_MS = 1500;
    const HOLD_MS = 3000;
    const FADE_MS = 800;
    const TOTAL_MS = DRAW_MS + HOLD_MS + FADE_MS;
    const ANN_COUNT = 4;

    // ── Helpers ────────────────────────────────────────────────────────────
    const ink = (a: number) => `rgba(120, 180, 255, ${a.toFixed(3)})`;
    const ease = (t: number) => t * t * (3 - 2 * t); // smoothstep

    // ── State ──────────────────────────────────────────────────────────────
    let w = 0,
      h = 0,
      frameId = 0;
    let gridCanvas: HTMLCanvasElement | null = null;

    type Ann = { type: number; x: number; y: number; birth: number };
    const anns: Ann[] = [];

    // ── Grid (pre-rendered offscreen) ──────────────────────────────────────
    const buildGrid = () => {
      const gc = document.createElement('canvas');
      gc.width = w;
      gc.height = h;
      const g = gc.getContext('2d')!;

      g.fillStyle = '#0d1b2a';
      g.fillRect(0, 0, w, h);

      g.lineWidth = 0.5;
      g.strokeStyle = 'rgba(100, 160, 255, 0.07)';
      g.beginPath();
      for (let x = 0; x <= w; x += CELL) {
        g.moveTo(x, 0);
        g.lineTo(x, h);
      }
      for (let y = 0; y <= h; y += CELL) {
        g.moveTo(0, y);
        g.lineTo(w, y);
      }
      g.stroke();

      g.lineWidth = 0.75;
      g.strokeStyle = 'rgba(100, 160, 255, 0.15)';
      g.beginPath();
      for (let x = 0; x <= w; x += MAJOR) {
        g.moveTo(x, 0);
        g.lineTo(x, h);
      }
      for (let y = 0; y <= h; y += MAJOR) {
        g.moveTo(0, y);
        g.lineTo(w, y);
      }
      g.stroke();

      g.fillStyle = 'rgba(100, 160, 255, 0.2)';
      g.font = '9px monospace';
      g.textAlign = 'left';
      g.textBaseline = 'top';
      for (let xi = 0; xi * MAJOR < w; xi++)
        for (let yi = 0; yi * MAJOR < h; yi++)
          g.fillText(`${String.fromCharCode(65 + (xi % 26))}${yi + 1}`, xi * MAJOR + 4, yi * MAJOR + 4);

      gridCanvas = gc;
    };

    // ── Annotation: Reticle ────────────────────────────────────────────────
    const drawReticle = (cx: number, cy: number, p: number, ba: number) => {
      const R1 = 36,
        R2 = 18,
        LINE = 52,
        GAP = R2 + 5;
      const p0 = ease(Math.min(1, p / 0.35));
      const p1 = ease(Math.max(0, Math.min(1, (p - 0.35) / 0.25)));
      const p2 = ease(Math.max(0, Math.min(1, (p - 0.6) / 0.4)));
      ctx.save();
      ctx.lineWidth = 0.8;
      if (p0 > 0) {
        ctx.strokeStyle = ink(ba * 0.85);
        ctx.beginPath();
        ctx.arc(cx, cy, R1, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p0);
        ctx.stroke();
      }
      if (p1 > 0) {
        ctx.strokeStyle = ink(ba * 0.65);
        ctx.beginPath();
        ctx.arc(cx, cy, R2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p1);
        ctx.stroke();
      }
      if (p2 > 0) {
        ctx.strokeStyle = ink(ba * 0.75);
        const ext = Math.max(0, LINE * p2 - GAP);
        ctx.beginPath();
        ctx.moveTo(cx - LINE * p2, cy);
        ctx.lineTo(cx - GAP, cy);
        ctx.moveTo(cx + GAP, cy);
        ctx.lineTo(cx + GAP + ext, cy);
        ctx.moveTo(cx, cy - LINE * p2);
        ctx.lineTo(cx, cy - GAP);
        ctx.moveTo(cx, cy + GAP);
        ctx.lineTo(cx, cy + GAP + ext);
        ctx.stroke();
        ctx.fillStyle = ink(ba * 0.9);
        ctx.beginPath();
        ctx.arc(cx, cy, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };

    // ── Annotation: Dimension arrow ────────────────────────────────────────
    const drawDimension = (cx: number, cy: number, p: number, ba: number) => {
      const HALF = 88,
        TICK = 7,
        AR = 5;
      const p0 = ease(Math.min(1, p / 0.55));
      const p1 = ease(Math.max(0, Math.min(1, (p - 0.55) / 0.25)));
      const p2 = ease(Math.max(0, Math.min(1, (p - 0.8) / 0.2)));
      ctx.save();
      ctx.lineWidth = 0.75;
      ctx.strokeStyle = ink(ba * 0.85);
      ctx.fillStyle = ink(ba * 0.85);
      if (p0 > 0) {
        ctx.beginPath();
        ctx.moveTo(cx - HALF, cy);
        ctx.lineTo(cx - HALF + HALF * 2 * p0, cy);
        ctx.stroke();
        ctx.setLineDash([2, 4]);
        ctx.strokeStyle = ink(ba * 0.4);
        ctx.beginPath();
        ctx.moveTo(cx - HALF, cy - 14);
        ctx.lineTo(cx - HALF, cy + 5);
        ctx.moveTo(cx + HALF, cy - 14);
        ctx.lineTo(cx + HALF, cy + 5);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (p1 > 0) {
        ctx.strokeStyle = ink(ba * 0.85);
        ctx.fillStyle = ink(ba * 0.85);
        ctx.beginPath();
        ctx.moveTo(cx - HALF, cy - TICK / 2);
        ctx.lineTo(cx - HALF, cy + TICK / 2);
        ctx.moveTo(cx + HALF, cy - TICK / 2);
        ctx.lineTo(cx + HALF, cy + TICK / 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - HALF, cy);
        ctx.lineTo(cx - HALF + AR * 2, cy - AR);
        ctx.lineTo(cx - HALF + AR * 2, cy + AR);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx + HALF, cy);
        ctx.lineTo(cx + HALF - AR * 2, cy - AR);
        ctx.lineTo(cx + HALF - AR * 2, cy + AR);
        ctx.closePath();
        ctx.fill();
      }
      if (p2 > 0) {
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = ink(ba * p2 * 0.9);
        ctx.fillText('180 mm', cx, cy - 6);
      }
      ctx.restore();
    };

    // ── Annotation: Detail callout box ─────────────────────────────────────
    const drawCallout = (cx: number, cy: number, p: number, ba: number) => {
      const W = 76,
        H = 44,
        CM = 7;
      const perim = (W + H) * 2;
      const p0 = ease(Math.min(1, p / 0.65));
      const p1 = ease(Math.max(0, Math.min(1, (p - 0.65) / 0.35)));
      ctx.save();
      ctx.lineWidth = 0.75;
      ctx.strokeStyle = ink(ba * 0.8);
      if (p0 > 0) {
        const dist = perim * p0;
        const x0 = cx - W / 2,
          y0 = cy - H / 2;
        const sides: [number, number, number, number, number][] = [
          [x0, y0, x0 + W, y0, W],
          [x0 + W, y0, x0 + W, y0 + H, H],
          [x0 + W, y0 + H, x0, y0 + H, W],
          [x0, y0 + H, x0, y0, H],
        ];
        let rem = dist;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        for (const [ax, ay, bx, by, len] of sides) {
          if (rem <= 0) break;
          const t = Math.min(1, rem / len);
          ctx.lineTo(ax + (bx - ax) * t, ay + (by - ay) * t);
          rem -= len;
        }
        ctx.stroke();
        // corner brackets
        ctx.strokeStyle = ink(ba * 0.55);
        ctx.beginPath();
        ctx.moveTo(x0 + CM, y0);
        ctx.lineTo(x0, y0);
        ctx.lineTo(x0, y0 + CM);
        ctx.moveTo(x0 + W - CM, y0);
        ctx.lineTo(x0 + W, y0);
        ctx.lineTo(x0 + W, y0 + CM);
        ctx.moveTo(x0, y0 + H - CM);
        ctx.lineTo(x0, y0 + H);
        ctx.lineTo(x0 + CM, y0 + H);
        ctx.moveTo(x0 + W, y0 + H - CM);
        ctx.lineTo(x0 + W, y0 + H);
        ctx.lineTo(x0 + W - CM, y0 + H);
        ctx.stroke();
      }
      if (p1 > 0) {
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = ink(ba * p1 * 0.9);
        ctx.fillText('DETAIL A', cx, cy - 5);
        ctx.fillStyle = ink(ba * p1 * 0.45);
        ctx.fillText('SCALE 1:50', cx, cy + 8);
      }
      ctx.restore();
    };

    // ── Annotation: Arc measurement ────────────────────────────────────────
    const drawArcMeasure = (cx: number, cy: number, p: number, ba: number) => {
      const R1 = 42,
        R2 = 26;
      const SPAN = Math.PI * 0.75; // 135°
      const p0 = ease(Math.min(1, p / 0.4));
      const p1 = ease(Math.max(0, Math.min(1, (p - 0.4) / 0.3)));
      const p2 = ease(Math.max(0, Math.min(1, (p - 0.7) / 0.3)));
      ctx.save();
      ctx.lineWidth = 0.75;
      ctx.strokeStyle = ink(ba * 0.85);
      if (p0 > 0) {
        ctx.beginPath();
        ctx.arc(cx, cy, R1, -Math.PI / 2, -Math.PI / 2 + SPAN * p0);
        ctx.stroke();
      }
      if (p1 > 0) {
        ctx.beginPath();
        ctx.arc(cx, cy, R2, -Math.PI / 2, -Math.PI / 2 + SPAN * p1);
        ctx.stroke();
      }
      if (p2 > 0) {
        const endA = -Math.PI / 2 + SPAN;
        ctx.beginPath();
        ctx.moveTo(cx, cy - R2);
        ctx.lineTo(cx, cy - R1);
        ctx.moveTo(cx + Math.cos(endA) * R2, cy + Math.sin(endA) * R2);
        ctx.lineTo(cx + Math.cos(endA) * R1, cy + Math.sin(endA) * R1);
        ctx.stroke();
        const midA = -Math.PI / 2 + SPAN / 2;
        const midR = (R1 + R2) / 2;
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = ink(ba * p2 * 0.9);
        ctx.fillText('135°', cx + Math.cos(midA) * midR, cy + Math.sin(midA) * midR);
      }
      ctx.restore();
    };

    // ── Annotation: Isometric cube ─────────────────────────────────────────
    const drawCube = (cx: number, cy: number, p: number, ba: number) => {
      const R = 28,
        c30 = 0.866,
        s30 = 0.5;
      const pr = (x: number, y: number, z: number): [number, number] => [cx + (x - y) * c30 * R, cy + ((x + y) * s30 - z) * R];
      const v001 = pr(0, 0, 1),
        v101 = pr(1, 0, 1),
        v011 = pr(0, 1, 1),
        v111 = pr(1, 1, 1);
      const v100 = pr(1, 0, 0),
        v010 = pr(0, 1, 0),
        v110 = pr(1, 1, 0);
      const edges: [[number, number], [number, number]][] = [
        [v001, v101],
        [v101, v111],
        [v111, v011],
        [v011, v001], // top face
        [v101, v100],
        [v011, v010],
        [v111, v110], // verticals
        [v100, v110],
        [v010, v110], // bottom edges
      ];
      ctx.save();
      ctx.lineWidth = 0.8;
      const N = edges.length;
      for (let i = 0; i < N; i++) {
        const ep = ease(Math.max(0, Math.min(1, (p - i / N) * N)));
        if (ep <= 0) break;
        ctx.strokeStyle = ink(ba * (i < 4 ? 0.9 : 0.7));
        const [a, b] = edges[i];
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(a[0] + (b[0] - a[0]) * ep, a[1] + (b[1] - a[1]) * ep);
        ctx.stroke();
      }
      ctx.restore();
    };

    // ── Annotation manager ─────────────────────────────────────────────────
    const spawn = (offset = 0): Ann => ({
      type: Math.floor(Math.random() * 5),
      x: MAJOR + Math.random() * Math.max(1, w - MAJOR * 2),
      y: MAJOR + Math.random() * Math.max(1, h - MAJOR * 2),
      birth: performance.now() - offset,
    });

    const renderAnn = (ann: Ann, now: number) => {
      const el = now - ann.birth;
      if (el < 0 || el >= TOTAL_MS) return;
      const progress = el < DRAW_MS ? el / DRAW_MS : 1;
      const alpha = el < DRAW_MS + HOLD_MS ? 1 : Math.max(0, 1 - (el - DRAW_MS - HOLD_MS) / FADE_MS);
      switch (ann.type) {
        case 0:
          drawReticle(ann.x, ann.y, progress, alpha);
          break;
        case 1:
          drawDimension(ann.x, ann.y, progress, alpha);
          break;
        case 2:
          drawCallout(ann.x, ann.y, progress, alpha);
          break;
        case 3:
          drawArcMeasure(ann.x, ann.y, progress, alpha);
          break;
        case 4:
          drawCube(ann.x, ann.y, progress, alpha);
          break;
      }
    };

    // ── Resize / init ──────────────────────────────────────────────────────
    const resize = () => {
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = w;
      canvas.height = h;
      buildGrid();
    };

    resize();
    for (let i = 0; i < ANN_COUNT; i++) anns.push(spawn(i * (TOTAL_MS / ANN_COUNT)));

    // ── Draw loop ──────────────────────────────────────────────────────────
    const draw = () => {
      if (gridCanvas) ctx.drawImage(gridCanvas, 0, 0);
      const now = performance.now();
      for (let i = 0; i < anns.length; i++) {
        if (now - anns[i].birth >= TOTAL_MS) anns[i] = spawn();
        renderAnn(anns[i], now);
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
