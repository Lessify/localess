import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { localeIcon } from './locale-icon.util';

/**
 * The flag badge for a locale: one circle, or two slightly overlapping circles when the locale
 * names both a language and a region - so "German (Switzerland)" and "Italian (Switzerland)" no
 * longer share an icon.
 *
 * It is decorative on purpose (`aria-hidden`, empty `alt`): a flag cannot identify a language on
 * its own - one language is spoken in many countries, and the writing system never shows at all -
 * so every call site keeps the locale name next to it, and screen readers get the name only.
 */
@Component({
  selector: 'll-locale-icon',
  templateUrl: './locale-icon.component.html',
  styleUrls: ['./locale-icon.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Height only, never `size-*`: the badge is wider than it is tall - always, so that one-flag and
  // two-flag locales line up in the same list - and a fixed width would clip the second flag. The
  // width comes from the stylesheet's aspect ratio.
  host: { 'aria-hidden': 'true', class: 'h-4' },
})
export class LocaleIconComponent {
  /** Locale id, e.g. `de-CH`. */
  locale = input.required<string>();

  icon = computed(() => localeIcon(this.locale()));
}
