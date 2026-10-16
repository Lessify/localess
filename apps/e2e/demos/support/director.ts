import { expect, type Locator, type Page } from '@playwright/test';

/**
 * A visible mouse pointer and click ripples for the recording (Playwright's video has no pointer). Added to every page
 * of the context; follows the real mouse events Playwright sends.
 */
export const CURSOR_SCRIPT = `(() => {
  // The app's dialogs, menus and selects are in the browser's top layer (popovers), above any z-index: the pointer
  // and the caption are popovers too, shown again whenever another one opens so they stay in front.
  window.__demoRaise = element => {
    if (!element || !element.isConnected) return;
    try {
      if (element.matches(':popover-open')) element.hidePopover();
      element.showPopover();
    } catch {}
  };
  const raiseAll = () => ['demo-caption', 'demo-cursor'].forEach(id => window.__demoRaise(document.getElementById(id)));
  addEventListener('toggle', event => {
    const target = event.target;
    if (event.newState === 'open' && target && !String(target.id).startsWith('demo-') && !target.classList?.contains('demo-ripple')) raiseAll();
  }, true);
  new MutationObserver(records => {
    const overlay = node => node.nodeType === 1 && !String(node.id).startsWith('demo-') && !node.classList.contains('demo-ripple') &&
      (node.matches('[popover], dialog') || node.querySelector('[popover], dialog'));
    if (records.some(record => [...record.addedNodes].some(overlay))) setTimeout(raiseAll, 0);
  }).observe(document, { childList: true, subtree: true });
  const install = () => {
    if (document.getElementById('demo-cursor')) return;
    const style = document.createElement('style');
    style.textContent = \`
      #demo-cursor, #demo-caption, .demo-ripple { margin: 0; border: 0; padding: 0; overflow: visible; background: transparent; color: inherit; }
      #demo-cursor { position: fixed; inset: 0 auto auto 0; z-index: 2147483647; pointer-events: none;
        width: 26px; height: 26px; transform: translate(-200px, -200px); transition: transform 16ms linear;
        filter: drop-shadow(0 2px 3px rgba(0,0,0,.35)); }
      .demo-ripple { position: fixed; inset: auto; z-index: 2147483646; pointer-events: none; width: 44px; height: 44px;
        margin: -22px 0 0 -22px !important; border-radius: 50%; background: rgba(59,130,246,.35) !important;
        border: 2px solid rgba(59,130,246,.9); animation: demo-ripple 550ms ease-out forwards; }
      @keyframes demo-ripple { from { transform: scale(.3); opacity: 1 } to { transform: scale(1.4); opacity: 0 } }
      #demo-caption { position: fixed; inset: 10px auto auto 50%; z-index: 2147483645; pointer-events: none;
        transform: translateX(-50%); max-width: 70%; padding: 12px 26px !important; border-radius: 999px;
        background: rgba(17,24,39,.9) !important; color: #fff !important; font: 600 20px/1.3 Inter, system-ui, sans-serif;
        box-shadow: 0 10px 30px rgba(0,0,0,.25); opacity: 0; transition: opacity 300ms ease; text-align: center; }
      #demo-caption.visible { opacity: 1; }
    \`;
    document.documentElement.appendChild(style);
    const cursor = document.createElement('div');
    cursor.id = 'demo-cursor';
    cursor.setAttribute('popover', 'manual');
    cursor.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26"><path d="M4 2l15 11.5-6.6 1.1 3.9 7.4-3 1.5-3.9-7.5L4 21z" fill="#111827" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    document.documentElement.appendChild(cursor);
    window.__demoRaise(cursor);
    const at = JSON.parse(sessionStorage.getItem('demo-cursor') || 'null');
    if (at) cursor.style.transform = 'translate(' + at[0] + 'px,' + at[1] + 'px)';
    addEventListener('mousemove', e => {
      cursor.style.transform = 'translate(' + (e.clientX - 3) + 'px,' + (e.clientY - 2) + 'px)';
      sessionStorage.setItem('demo-cursor', JSON.stringify([e.clientX - 3, e.clientY - 2]));
    }, true);
    addEventListener('mousedown', e => {
      const ripple = document.createElement('div');
      ripple.className = 'demo-ripple';
      ripple.style.left = e.clientX + 'px';
      ripple.style.top = e.clientY + 'px';
      ripple.setAttribute('popover', 'manual');
      document.documentElement.appendChild(ripple);
      window.__demoRaise(ripple);
      setTimeout(() => ripple.remove(), 600);
    }, true);
  };
  if (document.documentElement) install(); else addEventListener('DOMContentLoaded', install);
  new MutationObserver(install).observe(document, { childList: true, subtree: false });
})();`;

/** Drives the app like a person: moves the pointer to things, pauses, types at a readable speed, shows captions. */
export class Director {
  private x = 800;
  private y = 450;

  constructor(readonly page: Page) {}

  /** A full-screen title card at the start of the video (also hides the first blank frames). */
  async titleCard(title: string, subtitle: string): Promise<void> {
    await this.page.setContent(`<!doctype html><html><head><style>
      html, body { margin: 0; height: 100%; }
      body { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px;
        background: radial-gradient(circle at 30% 20%, #1e3a8a 0%, #0f172a 55%, #020617 100%);
        color: #fff; font-family: Inter, system-ui, sans-serif; }
      .brand { font-size: 26px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: #93c5fd; }
      h1 { margin: 0; font-size: 72px; font-weight: 800; letter-spacing: -.02em; }
      p { margin: 0; font-size: 28px; color: #cbd5e1; }
    </style></head><body><div class="brand">Localess</div><h1>${title}</h1><p>${subtitle}</p></body></html>`);
    await this.pause(2_800);
  }

  /** A caption at the bottom of the screen; `undefined` hides it. */
  async caption(text: string | undefined, hold = 900): Promise<void> {
    await this.page.evaluate(value => {
      let element = document.getElementById('demo-caption');
      if (!element) {
        element = document.createElement('div');
        element.id = 'demo-caption';
        element.setAttribute('popover', 'manual');
        document.documentElement.appendChild(element);
      }
      (window as unknown as { __demoRaise: (element: Element) => void }).__demoRaise(element);
      if (value) {
        element.textContent = value;
        // Next frame, so a new caption fades in.
        requestAnimationFrame(() => element!.classList.add('visible'));
      } else {
        element.classList.remove('visible');
      }
    }, text);
    if (text) await this.pause(hold);
  }

  async pause(ms = 600): Promise<void> {
    await this.page.waitForTimeout(ms);
  }

  /** Glides the pointer to the middle of an element. */
  async moveTo(locator: Locator): Promise<void> {
    await expect(locator).toBeVisible();
    await locator.scrollIntoViewIfNeeded();
    const box = await locator.boundingBox();
    if (!box) throw new Error('nothing to point at');
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    const distance = Math.hypot(x - this.x, y - this.y);
    await this.page.mouse.move(x, y, { steps: Math.max(12, Math.min(45, Math.round(distance / 18))) });
    this.x = x;
    this.y = y;
  }

  async hover(locator: Locator, hold = 500): Promise<void> {
    await this.moveTo(locator);
    await this.pause(hold);
  }

  /** Moves to the element, waits a beat, clicks it. */
  async click(locator: Locator, after = 450): Promise<void> {
    await this.moveTo(locator);
    await this.pause(220);
    await locator.click();
    await this.pause(after);
  }

  /** Clicks a field and types into it at a readable speed (replacing what it had). */
  async type(locator: Locator, text: string, { clear = true, delay = 55 } = {}): Promise<void> {
    await this.click(locator, 150);
    if (clear) await locator.fill('');
    await locator.pressSequentially(text, { delay });
    await this.pause(350);
  }

  /** Presses a key (Enter for a label chip, Escape to close a list). */
  async press(key: string, after = 350): Promise<void> {
    await this.page.keyboard.press(key);
    await this.pause(after);
  }

  /** Picks an option of an open select or menu. */
  async choose(trigger: Locator, option: Locator): Promise<void> {
    await this.click(trigger, 400);
    await this.click(option, 400);
  }

  /** Waits for a toast (the app's confirmation), and lets it be read. */
  async toast(text: string | RegExp, hold = 1_200): Promise<void> {
    await expect(this.page.locator('[data-sonner-toast]').filter({ hasText: text }).first()).toBeVisible();
    await this.pause(hold);
  }
}
