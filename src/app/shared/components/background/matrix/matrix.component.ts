import { afterNextRender, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject, viewChild } from '@angular/core';

@Component({
  selector: 'll-matrix',
  templateUrl: './matrix.component.html',
  styleUrls: ['./matrix.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatrixComponent {
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

    // Half-width katakana + numerals + symbols — the classic Matrix character set
    const CHARS = 'ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ' + '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ@#$%&*<>';
    const FONT_SIZE = 14;
    const MAX_TRAIL = 28; // character buffer per column

    type Column = {
      x: number;
      speed: number; // fractional rows per frame
      head: number; // head row (fractional)
      length: number; // visible trail rows
      chars: string[]; // MAX_TRAIL-length char buffer
    };

    let w = 0,
      h = 0,
      frameId = 0;
    let columns: Column[] = [];

    const randChar = () => CHARS[Math.floor(Math.random() * CHARS.length)];

    const mkColumn = (x: number): Column => ({
      x,
      speed: 0.18 + Math.random() * 0.32,
      head: -(2 + Math.random() * 30), // stagger start above screen
      length: 10 + Math.floor(Math.random() * 18),
      chars: Array.from({ length: MAX_TRAIL }, randChar),
    });

    const resize = () => {
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = w;
      canvas.height = h;
      const numCols = Math.floor(w / FONT_SIZE);
      columns = Array.from({ length: numCols }, (_, i) => mkColumn(i * FONT_SIZE));
    };

    const draw = () => {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);

      ctx.font = `${FONT_SIZE}px monospace`;
      ctx.textAlign = 'left';

      const maxRow = Math.ceil(h / FONT_SIZE) + 1;

      for (const col of columns) {
        col.head += col.speed;

        // Occasionally mutate trail characters (glitch effect)
        for (let j = 1; j < col.length; j++) {
          if (Math.random() < 0.03) col.chars[j % MAX_TRAIL] = randChar();
        }
        // Head character always flickers
        col.chars[0] = randChar();

        // Reset column when its tail has cleared the bottom
        if ((col.head - col.length) * FONT_SIZE > h) {
          col.head = -(2 + Math.random() * 20);
          col.speed = 0.18 + Math.random() * 0.32;
          col.length = 10 + Math.floor(Math.random() * 18);
          col.chars = Array.from({ length: MAX_TRAIL }, randChar);
        }

        const headRow = Math.floor(col.head);

        // Draw from tail → head so the head renders on top
        for (let j = col.length - 1; j >= 0; j--) {
          const row = headRow - j; // j=0 is head, j=length-1 is tail
          if (row < 0 || row > maxRow) continue;

          const y = (row + 1) * FONT_SIZE; // +1 so row 0 is fully visible
          const char = col.chars[j % MAX_TRAIL];

          if (j === 0) {
            // Leading character: near-white green
            ctx.fillStyle = '#d0ffd0';
          } else {
            // Trail: exponential fade toward tail
            const t = 1 - j / col.length; // 1 near head, 0 at tail
            const alpha = Math.pow(t, 1.6);
            const lightness = Math.round(18 + 52 * t); // 70% near head → 18% at tail
            ctx.fillStyle = `hsla(120, 100%, ${lightness}%, ${alpha.toFixed(3)})`;
          }

          ctx.fillText(char, col.x, y);
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
