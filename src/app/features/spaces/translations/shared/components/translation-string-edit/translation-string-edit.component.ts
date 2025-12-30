import { ChangeDetectionStrategy, Component, computed, ElementRef, input, model, viewChild } from '@angular/core';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';

@Component({
  selector: 'll-translation-string-edit',
  standalone: true,
  templateUrl: './translation-string-edit.component.html',
  styleUrls: ['./translation-string-edit.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmInputGroupImports],
})
export class TranslationStringEditComponent {
  value = model.required<string>();
  enableHighlighting = input<boolean>(false);

  readonly $backdrop = viewChild.required<ElementRef<HTMLDivElement>>('backdrop');
  readonly $textarea = viewChild.required<ElementRef<HTMLTextAreaElement>>('textarea');
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

  protected handleScroll(): void {
    const textarea = this.$textarea().nativeElement;
    const backdrop = this.$backdrop().nativeElement;

    backdrop.scrollTop = textarea.scrollTop;
    backdrop.scrollLeft = textarea.scrollLeft;
  }
}
