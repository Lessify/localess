import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { LlTreeNode } from './tree-node.model';
import { LlTreeImports } from './tree.imports';

const NODES: LlTreeNode[] = [
  {
    key: 'home',
    name: 'home',
    children: [
      { key: 'home.title', name: 'title' },
      { key: 'home.subtitle', name: 'subtitle' },
    ],
  },
  { key: 'footer', name: 'footer' },
];

/** Three levels deep, for asserting indentation geometry. */
const DEEP_NODES: LlTreeNode[] = [
  {
    key: 'a',
    name: 'a',
    children: [{ key: 'a.b', name: 'b', children: [{ key: 'a.b.c', name: 'c' }] }],
  },
];

@Component({
  selector: 'll-tree-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LlTreeImports],
  template: `
    <ll-tree
      [nodes]="nodes()"
      [(expandedKeys)]="expandedKeys"
      [(selectedKey)]="selectedKey"
      [indent]="indent()"
      [guides]="guides()"
      (nodeSelect)="selected.set($event)">
      <ng-template llTreeNodeDef let-node>
        <span class="node-name">{{ node.name }}</span>
      </ng-template>
    </ll-tree>
  `,
})
class TreeHostComponent {
  readonly nodes = signal<LlTreeNode[]>(NODES);
  readonly expandedKeys = signal<ReadonlySet<string>>(new Set<string>());
  readonly selectedKey = signal<string | undefined>(undefined);
  readonly selected = signal<LlTreeNode | undefined>(undefined);
  readonly indent = signal(16);
  readonly guides = signal(false);
}

describe('LlTree', () => {
  /**
   * Aria's `TreeItem` publishes expansion to its deferred content from an
   * `afterRenderEffect`, which `detectChanges()` alone does not flush — so every
   * settle point here has to await stability or children never mount.
   */
  async function settle(fixture: ComponentFixture<TreeHostComponent>): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function setup(): Promise<{ fixture: ComponentFixture<TreeHostComponent>; host: TreeHostComponent }> {
    const fixture = TestBed.createComponent(TreeHostComponent);
    await settle(fixture);
    return { fixture, host: fixture.componentInstance };
  }

  function items(fixture: ComponentFixture<TreeHostComponent>): HTMLElement[] {
    return fixture.debugElement.queryAll(By.css('[data-slot="tree-item"]')).map(it => it.nativeElement as HTMLElement);
  }

  function rows(fixture: ComponentFixture<TreeHostComponent>): HTMLElement[] {
    return fixture.debugElement.queryAll(By.css('[data-slot="tree-item-row"]')).map(it => it.nativeElement as HTMLElement);
  }

  /** A node's own label, excluding the descendants nested inside its `<li>`. */
  function labels(fixture: ComponentFixture<TreeHostComponent>): (string | undefined)[] {
    return rows(fixture).map(it => it.textContent?.trim());
  }

  /** Aria binds `pointerdown`, not `click` — `HTMLElement.click()` is a no-op for it. */
  function pointerdown(element: HTMLElement): void {
    element.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
  }

  it('renders the root as role="tree"', async () => {
    const { fixture } = await setup();

    expect(fixture.debugElement.query(By.css('[data-slot="tree"]')).nativeElement.getAttribute('role')).toBe('tree');
  });

  it('renders only root nodes while everything is collapsed', async () => {
    const { fixture } = await setup();

    expect(labels(fixture)).toEqual(['home', 'footer']);
  });

  it('renders the consumer node template', async () => {
    const { fixture } = await setup();

    expect(fixture.debugElement.query(By.css('.node-name')).nativeElement.textContent.trim()).toBe('home');
  });

  it('renders children once the parent key is expanded', async () => {
    const { fixture, host } = await setup();

    host.expandedKeys.set(new Set(['home']));
    await settle(fixture);

    expect(labels(fixture)).toEqual(['home', 'title', 'subtitle', 'footer']);
  });

  it('marks group nodes with aria-expanded and leaves without it', async () => {
    const { fixture } = await setup();
    const [home, footer] = items(fixture);

    expect(home.getAttribute('aria-expanded')).toBe('false');
    expect(footer.hasAttribute('aria-expanded')).toBe(false);
  });

  it('writes back to expandedKeys when a group row is clicked', async () => {
    const { fixture, host } = await setup();

    pointerdown(rows(fixture)[0]);
    await settle(fixture);

    expect([...host.expandedKeys()]).toEqual(['home']);
  });

  it('marks child groups for guide lines only when guides is enabled', async () => {
    const { fixture, host } = await setup();
    host.expandedKeys.set(new Set(['home']));
    await settle(fixture);
    const group = (): HTMLElement => fixture.debugElement.query(By.css('[data-slot="tree-group"]')).nativeElement;

    expect(group().hasAttribute('data-guides')).toBe(false);

    host.guides.set(true);
    await settle(fixture);

    expect(group().hasAttribute('data-guides')).toBe(true);
    expect(group().style.getPropertyValue('--ll-tree-guide-left')).toBe('16px');
  });

  /*
   * NOTE: the guide's `z-index: 1` — which keeps ancestor guides above a selected
   * row's opaque background — is deliberately not asserted here. happy-dom does not
   * compute pseudo-element styles (`getComputedStyle(el, '::before')` returns empty),
   * so it can only be verified in a real browser.
   */

  describe('indentation geometry', () => {
    async function deepTree(guides: boolean): Promise<ComponentFixture<TreeHostComponent>> {
      const { fixture, host } = await setup();
      host.nodes.set(DEEP_NODES);
      host.guides.set(guides);
      host.expandedKeys.set(new Set(['a', 'a.b']));
      await settle(fixture);
      return fixture;
    }

    /*
     * Indentation is a MARGIN on the row, not padding: it must sit outside the row's
     * box so the selected/hover highlight wraps only the node itself rather than the
     * whole line. A prefix row is a synthesised namespace segment, not a record, so a
     * full-width bar would misrepresent it.
     */
    it('indents linearly by level, independent of guides', async () => {
      const withoutGuides = await deepTree(false);
      const withGuides = await deepTree(true);

      const expected = ['0px', '16px', '32px'];
      expect(rows(withoutGuides).map(it => it.style.marginLeft)).toEqual(expected);
      expect(rows(withGuides).map(it => it.style.marginLeft)).toEqual(expected);
    });

    it('keeps the highlight box inset, so it never spans the indent', async () => {
      const fixture = await deepTree(false);

      expect(rows(fixture).map(it => it.style.paddingLeft)).toEqual(['', '', '']);
    });

    it('never offsets a child group, so indentation is not counted twice', async () => {
      const fixture = await deepTree(true);

      const groups = fixture.debugElement
        .queryAll(By.css('[data-slot="tree-group"]'))
        .map(it => (it.nativeElement as HTMLElement).style.marginLeft);

      expect(groups).toEqual(['', '']);
    });
  });

  describe('pointer targeting', () => {
    /*
     * Aria resolves the pressed item with `event.target instanceof HTMLElement`
     * (`_getItem` in @angular/aria). An <svg> is an SVGElement, so icons must be
     * transparent to hit-testing or pressing one silently does nothing.
     *
     * This asserts the rule is declared, not that hit-testing honours it: CSS
     * `pointer-events` only affects hit-testing, which `dispatchEvent` bypasses, and
     * Tailwind's stylesheet is not applied under happy-dom so computed style reads
     * empty. It is a regression guard against the class being dropped; the behaviour
     * itself needs a real browser.
     */
    it('declares icons inside a row as transparent to pointer hit-testing', async () => {
      const { fixture } = await setup();

      expect(fixture.debugElement.query(By.css('[data-slot="tree-item-chevron"] svg'))).toBeTruthy();
      expect(rows(fixture)[0].className).toContain('[&_svg]:pointer-events-none');
    });
  });

  describe('state does not leak to descendants', () => {
    /*
     * Tree items nest, so Tailwind's `group-*` variants — which compile to a
     * descendant selector — let an ancestor's state style every descendant row.
     * These rules must stay child-combinator scoped.
     */
    it('does not rotate a collapsed child chevron when an ancestor is expanded', async () => {
      const { fixture, host } = await setup();
      host.nodes.set(DEEP_NODES);
      host.expandedKeys.set(new Set(['a']));
      await settle(fixture);

      const chevrons = fixture.debugElement
        .queryAll(By.css('[data-slot="tree-item-chevron"]'))
        .map(it => getComputedStyle(it.nativeElement as Element).transform);

      expect(chevrons).toHaveLength(2);
      expect(chevrons[0]).toBe('rotate(90deg)');
      expect(chevrons[1]).not.toBe('rotate(90deg)');
    });

    it('does not apply selected styling to a descendant row', async () => {
      const { fixture, host } = await setup();
      host.nodes.set(DEEP_NODES);
      host.expandedKeys.set(new Set(['a', 'a.b']));
      host.selectedKey.set('a.b.c');
      await settle(fixture);

      const weights = rows(fixture).map(it => getComputedStyle(it).fontWeight);

      expect(weights.at(-1)).toBe('500');
      expect(weights.slice(0, -1).every(it => it !== '500')).toBe(true);
    });
  });

  describe('selection', () => {
    it('emits nodeSelect and updates selectedKey when a leaf is clicked', async () => {
      const { fixture, host } = await setup();
      host.expandedKeys.set(new Set(['home']));
      await settle(fixture);

      pointerdown(rows(fixture)[1]);
      await settle(fixture);

      expect(host.selectedKey()).toBe('home.title');
      expect(host.selected()?.key).toBe('home.title');
    });

    it('does not select a group node', async () => {
      const { fixture, host } = await setup();

      pointerdown(rows(fixture)[0]);
      await settle(fixture);

      expect(host.selectedKey()).toBeUndefined();
      expect(host.selected()).toBeUndefined();
    });

    it('reflects an externally set selectedKey as aria-selected', async () => {
      const { fixture, host } = await setup();
      host.expandedKeys.set(new Set(['home']));
      host.selectedKey.set('home.title');
      await settle(fixture);

      expect(items(fixture)[1].getAttribute('aria-selected')).toBe('true');
    });
  });
});
