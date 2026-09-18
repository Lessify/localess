import { TestBed } from '@angular/core/testing';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { vi } from 'vitest';

import { WhatsNewDialogComponent } from './whats-new-dialog.component';
import { WHATS_NEW } from './whats-new.data';

describe('WhatsNewDialogComponent', () => {
  function setup() {
    // `hlmDialogClose` on the footer button injects the ref, so the dialog cannot render without it.
    TestBed.configureTestingModule({ providers: [{ provide: BrnDialogRef, useValue: { close: vi.fn() } }] });
    const fixture = TestBed.createComponent(WhatsNewDialogComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('renders one card per release note', () => {
    const fixture = setup();

    const cards = fixture.nativeElement.querySelectorAll('[data-testid="whats-new-entry"]');

    expect(cards.length).toBe(WHATS_NEW.length);
  });

  it('renders the title, description and version of every entry', () => {
    const fixture = setup();

    const text = fixture.nativeElement.textContent;
    for (const entry of WHATS_NEW) {
      expect(text).toContain(entry.title);
      expect(text).toContain(entry.description);
      expect(text).toContain(entry.version);
    }
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
  it('has every field filled in', () => {
    for (const entry of WHATS_NEW) {
      expect(entry.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(entry.title.length).toBeGreaterThan(0);
      expect(entry.description.length).toBeGreaterThan(0);
    }
  });

  /** The dialog renders the array as-is, so ordering is the data's responsibility. */
  it('is ordered newest first', () => {
    const dates = WHATS_NEW.map(entry => entry.date);

    expect(dates).toEqual([...dates].sort().reverse());
  });
});
