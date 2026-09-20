import { TestBed } from '@angular/core/testing';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { vi } from 'vitest';

import { WhatsNewDialogComponent } from './whats-new-dialog.component';
import { WHATS_NEW } from './whats-new.data';
import { WHATS_NEW_LABEL_CLASS, WhatsNewLabel, isVersionAtLeast, isVersionNewer } from './whats-new.model';

const LABELS: WhatsNewLabel[] = ['new', 'improved', 'fixed'];

describe('WhatsNewDialogComponent', () => {
  function setup() {
    // `hlmDialogClose` on the footer button injects the ref, so the dialog cannot render without it.
    TestBed.configureTestingModule({ providers: [{ provide: BrnDialogRef, useValue: { close: vi.fn() } }] });
    const fixture = TestBed.createComponent(WhatsNewDialogComponent);
    fixture.detectChanges();
    return fixture;
  }

  /** The point of the grouping: a version is one block, however many stories it shipped. */
  it('renders one card per release rather than per item', () => {
    const fixture = setup();

    const cards = fixture.nativeElement.querySelectorAll('[data-testid="whats-new-release"]');

    expect(cards.length).toBe(WHATS_NEW.length);
    expect(cards.length).toBeLessThan(WHATS_NEW.flatMap(release => release.items).length);
  });

  it('renders the version and description of every release', () => {
    const fixture = setup();

    const text = fixture.nativeElement.textContent;
    for (const release of WHATS_NEW) {
      expect(text).toContain(release.version);
      expect(text).toContain(release.description);
    }
  });

  it('renders every item inside its release card', () => {
    const fixture = setup();

    const cards = fixture.nativeElement.querySelectorAll('[data-testid="whats-new-release"]');
    WHATS_NEW.forEach((release, index) => {
      const card = cards[index];
      expect(card.querySelectorAll('[data-testid="whats-new-item"]').length).toBe(release.items.length);
      for (const item of release.items) {
        expect(card.textContent).toContain(item.title);
        expect(card.textContent).toContain(item.description);
        expect(card.textContent).toContain(item.label);
      }
    });
  });

  /** The raw `YYYY-MM-DD` would read as a database field; users get the formatted date. */
  it('renders the date formatted rather than raw', () => {
    const fixture = setup();

    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Sep 18, 2026');
    expect(text).not.toContain('2026-09-18');
  });
});

describe('WHATS_NEW data', () => {
  it('has every release field filled in', () => {
    for (const release of WHATS_NEW) {
      expect(release.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(release.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(release.description.length).toBeGreaterThan(0);
      expect(release.items.length).toBeGreaterThan(0);
    }
  });

  it('has every item field filled in and labelled', () => {
    for (const item of WHATS_NEW.flatMap(release => release.items)) {
      expect(item.title.length).toBeGreaterThan(0);
      expect(item.description.length).toBeGreaterThan(0);
      expect(LABELS).toContain(item.label);
    }
  });

  /** One block per version is the whole point - a repeated version would split it back up. */
  it('lists each version once', () => {
    const versions = WHATS_NEW.map(release => release.version);

    expect(new Set(versions).size).toBe(versions.length);
  });

  /** The dialog renders the array as-is, so ordering is the data's responsibility. */
  it('is ordered newest first', () => {
    const dates = WHATS_NEW.map(release => release.date);

    expect(dates).toEqual([...dates].sort().reverse());
  });
});

describe('WHATS_NEW_LABEL_CLASS', () => {
  /** A label with no colour would render as a bare outline badge, silently losing its meaning. */
  it('gives every label a colour', () => {
    for (const label of LABELS) {
      expect(WHATS_NEW_LABEL_CLASS[label]).toBeTruthy();
    }
  });

  /** The dialog is themed, so a colour with no dark counterpart would wash out in dark mode. */
  it('pairs every colour with a dark-mode value', () => {
    for (const label of LABELS) {
      expect(WHATS_NEW_LABEL_CLASS[label]).toContain('dark:');
    }
  });
});

describe('isVersionNewer', () => {
  it('treats nothing seen yet as older than any release', () => {
    expect(isVersionNewer('4.0.0', '')).toBe(true);
  });

  it('is false for the version already seen', () => {
    expect(isVersionNewer('4.0.0', '4.0.0')).toBe(false);
  });

  it('is false when the seen version is ahead', () => {
    expect(isVersionNewer('3.0.0', '4.0.0')).toBe(false);
  });

  /** The trap a string comparison falls into: '3.10.0' < '3.9.0' as text, but not as versions. */
  it('compares parts as numbers, not as text', () => {
    expect(isVersionNewer('3.10.0', '3.9.0')).toBe(true);
    expect(isVersionNewer('3.9.0', '3.10.0')).toBe(false);
  });

  it('compares patch and minor parts', () => {
    expect(isVersionNewer('3.0.1', '3.0.0')).toBe(true);
    expect(isVersionNewer('3.1.0', '3.0.1')).toBe(true);
  });

  it('treats a missing part as zero', () => {
    expect(isVersionNewer('4.0', '4.0.0')).toBe(false);
    expect(isVersionNewer('4.0.1', '4.0')).toBe(true);
  });
});

describe('isVersionAtLeast', () => {
  /** The floor is inclusive - 4.0.0 is supported, it is simply not newer than itself. */
  it('accepts the minimum itself', () => {
    expect(isVersionAtLeast('4.0.0', '4.0.0')).toBe(true);
  });

  it('accepts anything after the minimum', () => {
    expect(isVersionAtLeast('4.0.1', '4.0.0')).toBe(true);
    expect(isVersionAtLeast('10.0.0', '4.0.0')).toBe(true);
  });

  it('rejects anything before the minimum', () => {
    expect(isVersionAtLeast('3.2.0', '4.0.0')).toBe(false);
  });

  /**
   * The tags support was dropped for still arrive from GitHub. Worth pinning: `Number('v3')` is
   * `NaN`, and a comparison against `NaN` is false either way, so an unguarded floor lets these in.
   */
  it('rejects a tag it cannot read as a version', () => {
    expect(isVersionAtLeast('v3.2.0', '4.0.0')).toBe(false);
    expect(isVersionAtLeast('v9.9.9', '4.0.0')).toBe(false);
    expect(isVersionAtLeast('', '4.0.0')).toBe(false);
    expect(isVersionAtLeast('4.0.0-rc1', '4.0.0')).toBe(false);
  });

  it('ignores how deeply a version is written', () => {
    expect(isVersionAtLeast('4.0', '4.0.0')).toBe(true);
  });
});
