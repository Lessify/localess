import { Directive } from '@angular/core';

/**
 * Wraps an `ll-table` for `@container` responsive column queries. Deliberately
 * no `overflow-auto` here: without a bounded height it never scrolls itself,
 * but as a CSS scroll container it would still intercept sticky header/footer
 * rows and a sticky `ll-paginator` from resolving against the real scrolling
 * ancestor (`main`), breaking stickiness page-wide.
 */
@Directive({
  selector: 'div[llTableContainer]',
  host: {
    class: 'relative w-full @container/table',
  },
})
export class LlTableContainer {}
