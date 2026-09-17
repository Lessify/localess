import { TestBed } from '@angular/core/testing';

import { LocaleIconComponent } from './locale-icon.component';

describe('LocaleIconComponent', () => {
  function setup(locale: string) {
    const fixture = TestBed.createComponent(LocaleIconComponent);
    fixture.componentRef.setInput('locale', locale);
    fixture.detectChanges();
    return fixture;
  }

  /**
   * One circle per flag, not one circle split in two: at 16px a halved circle read as a single
   * smudged flag rather than as two separate things. The language circle comes first in the DOM
   * *and* sits in front of the region one - see `--language` in the stylesheet.
   */
  it('renders both flags of a pair in their own circles, language first', () => {
    const fixture = setup('de-CH');

    const discs = fixture.nativeElement.querySelectorAll('.ll-locale-icon__disc');
    const images = fixture.nativeElement.querySelectorAll('img');
    expect(discs.length).toBe(2);
    expect(discs[0].classList).toContain('ll-locale-icon__disc--language');
    expect(discs[1].classList).toContain('ll-locale-icon__disc--region');
    expect(images.length).toBe(2);
    expect(images[0].getAttribute('src')).toBe('assets/flags/language/de.svg');
    expect(images[1].getAttribute('src')).toBe('assets/flags/ch.svg');
  });

  it('renders a single circle when the locale shows one flag', () => {
    const fixture = setup('de-DE');

    expect(fixture.nativeElement.querySelectorAll('.ll-locale-icon__disc').length).toBe(1);
    expect(fixture.nativeElement.querySelectorAll('img').length).toBe(1);
  });

  /**
   * The host sets a height and nothing else: the width is an aspect ratio in the stylesheet, one
   * that reserves room for two flags whether or not the locale has them, so a list mixing one- and
   * two-flag locales keeps its labels on one vertical line. A `size-*` or `w-*` class would pin the
   * width and clip the second flag.
   */
  it('sets a height on the host and leaves the width to the stylesheet', () => {
    for (const locale of ['de-CH', 'de-DE', 'asa']) {
      const fixture = setup(locale);

      expect(fixture.nativeElement.classList).toContain('h-4');
      expect(fixture.nativeElement.className).not.toMatch(/\bsize-|\bw-/);
    }
  });

  it('renders the language code when no flag exists', () => {
    const fixture = setup('asa');

    expect(fixture.nativeElement.querySelectorAll('img').length).toBe(0);
    expect(fixture.nativeElement.querySelector('.ll-locale-icon__code').textContent.trim()).toBe('ASA');
  });

  /**
   * The icon carries no information a screen reader can use - a flag does not name a language, and
   * every call site prints the locale name next to it - so it is hidden rather than labelled.
   */
  it('is hidden from assistive technology', () => {
    const fixture = setup('de-CH');

    expect(fixture.nativeElement.getAttribute('aria-hidden')).toBe('true');
    fixture.nativeElement.querySelectorAll('img').forEach((image: HTMLImageElement) => {
      expect(image.getAttribute('alt')).toBe('');
    });
  });

  it('follows the locale when it changes', () => {
    const fixture = setup('de-CH');

    fixture.componentRef.setInput('locale', 'it-CH');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('img').getAttribute('src')).toBe('assets/flags/language/it.svg');
  });
});
