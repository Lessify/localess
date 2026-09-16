import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { provideIcons } from '@ng-icons/core';
import { lucideLanguages } from '@ng-icons/lucide';
import { Locale } from '@shared/models/locale.model';
import { CanUserPerformPipe } from '@shared/pipes/can-user-perform.pipe';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';

/**
 * The "translate this field with AI" button and its source-locale menu, shared by the RICH_TEXT and
 * MARKDOWN field editors.
 *
 * Only the menu is shared - each editor runs the translation itself, because the two field kinds
 * send different things to the provider: markdown goes as plain text, rich text as HTML. This
 * component just reports which locale to translate from.
 */
@Component({
  selector: 'll-translate-menu',
  templateUrl: './translate-menu.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  imports: [CommonModule, HlmTooltipImports, HlmIconImports, HlmInputGroupImports, HlmDropdownMenuImports, CanUserPerformPipe],
  providers: [provideIcons({ lucideLanguages })],
})
export class TranslateMenuComponent {
  selectedLocale = input.required<Locale>();
  availableLocales = input.required<Locale[]>();

  /**
   * Where the host puts this button, which decides how it is nudged into place:
   *
   * - `toolbar` - the last item in an editor's block-start formatting row. `ms-auto` pushes it to
   *   the right-hand end. An `align="inline-end"` addon cannot be used there, because an input
   *   group containing a block-start addon is switched to `flex-col` and the addon would stack
   *   below the editor instead.
   * - `addon` - alone inside an `align="inline-end"` addon, as the TEXT and TEXTAREA fields place
   *   it. That addon pulls a button flush to its edge with `has-[>button]:me-[-0.3rem]`, which
   *   only matches a *direct* child - this component sits in between - so the same offset is
   *   applied here to land in the identical spot.
   */
  placement = input<'toolbar' | 'addon'>('toolbar');

  placementClass = computed(() => (this.placement() === 'addon' ? 'me-[-0.3rem]' : 'ms-auto'));

  /** The locale to translate from. The target is always the currently selected locale. */
  translateFrom = output<string>();

  sourceLocales = computed(() => this.availableLocales().filter(locale => locale.id !== this.selectedLocale().id));
}
