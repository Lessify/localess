import { Directive } from '@angular/core';
import { HlmTableContainer } from '@spartan-ng/helm/table';

/**
 * Wraps an `ll-table` for `@container` responsive column queries, composing
 * `HlmTableContainer` (which applies `relative w-full overflow-x-auto`) so
 * wide tables scroll within this container instead of widening `main`
 * page-wide. Note: as a CSS scroll container this also intercepts sticky
 * header/footer rows and a sticky `ll-paginator` from resolving against
 * `main`, breaking their stickiness — normal table behaviour is prioritized
 * here; sticky header/pagination is a follow-up.
 */
@Directive({
  selector: 'div[llTableContainer]',
  host: {
    class: '@container/table',
  },
  hostDirectives: [HlmTableContainer],
})
export class LlTableContainer {}
