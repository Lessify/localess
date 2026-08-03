import { SecurityContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DomSanitizer } from '@angular/platform-browser';

import { SafeHtmlPipe } from './safe-html.pipe';

describe('SafeHtmlPipe', () => {
  function createPipe(): SafeHtmlPipe {
    return TestBed.runInInjectionContext(() => new SafeHtmlPipe());
  }

  it('marks HTML with an event-handler attribute as trusted, bypassing normal sanitization', () => {
    const sanitizer = TestBed.inject(DomSanitizer);
    const html = '<div onclick="doSomething()">click</div>';
    const pipe = createPipe();

    const safe = pipe.transform(html);

    expect(sanitizer.sanitize(SecurityContext.HTML, safe)).toBe(html);
    expect(sanitizer.sanitize(SecurityContext.HTML, html)).not.toContain('onclick');
  });

  it('preserves plain safe markup untouched', () => {
    const sanitizer = TestBed.inject(DomSanitizer);
    const html = '<b>Bold text</b>';
    const pipe = createPipe();

    const safe = pipe.transform(html);

    expect(sanitizer.sanitize(SecurityContext.HTML, safe)).toBe(html);
  });
});
