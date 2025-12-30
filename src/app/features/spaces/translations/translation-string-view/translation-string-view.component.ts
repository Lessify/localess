import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'll-translation-string-view',
  standalone: true,
  templateUrl: './translation-string-view.component.html',
  styleUrls: ['./translation-string-view.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TranslationStringViewComponent {
  value = input.required<string>();
  enableHighlighting = input<boolean>(false);
  readonly highlightedText = computed(() => this.applyHighlights(this.value()));

  private applyHighlights(text: string): string {
    if (!text) {
      return '';
    }
    // Add extra newline at end for proper display
    let result = text.replace(/\n$/g, '\n\n');
    // Highlight text between {{ and }} including the brackets
    result = result.replace(/{{[^}]*}}/g, '<mark>$&</mark>');
    return result;
  }
}
