import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MarkdownComponent, MarkdownService } from 'ngx-markdown';
import { vi } from 'vitest';

import { ContentsModule } from './contents.module';

@Component({
  template: '<markdown [data]="markdown" />',
  imports: [MarkdownComponent],
})
class MarkdownHostComponent {
  markdown = '# Heading\n\nSome **bold** copy.';
}

describe('ContentsModule', () => {
  // `<markdown>` is rendered by the markdown editor under this route, and MarkdownService has no
  // `providedIn`, so it only resolves if this module provides it. It deliberately is NOT in the
  // root providers - that is what keeps `marked` out of the initial bundle.
  it('provides MarkdownService to the lazily loaded contents injector', () => {
    TestBed.configureTestingModule({ imports: [ContentsModule], providers: [provideRouter([])] });

    expect(TestBed.inject(MarkdownService)).toBeInstanceOf(MarkdownService);
  });

  it('renders markdown through that injector', async () => {
    TestBed.configureTestingModule({ imports: [ContentsModule], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(MarkdownHostComponent);
    const rendered: HTMLElement = fixture.nativeElement;

    fixture.detectChanges();
    // ngx-markdown parses asynchronously, so the DOM lands a microtask after change detection.
    await vi.waitFor(() => expect(rendered.querySelector('h1')).not.toBeNull());

    expect(rendered.querySelector('h1')?.textContent).toBe('Heading');
    expect(rendered.querySelector('strong')?.textContent).toBe('bold');
  });

  it('highlights fenced code blocks once Prism is loaded', async () => {
    // What the markdown editor does before opening a preview: ngx-markdown calls the global
    // Prism and silently skips highlighting when it is missing, so this is the real regression
    // guard for loading prismjs on demand instead of as a global script.
    await import('prismjs');
    TestBed.configureTestingModule({ imports: [ContentsModule], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(MarkdownHostComponent);
    fixture.componentInstance.markdown = '```js\nconst answer = 42;\n```';
    const rendered: HTMLElement = fixture.nativeElement;

    fixture.detectChanges();

    await vi.waitFor(() => expect(rendered.querySelector('code .token')).not.toBeNull());
    expect(rendered.querySelector('code .token')?.textContent).toBe('const');
  });
});
