import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'll-translation-array-view',
  standalone: true,
  templateUrl: './translation-array-view.component.html',
  styleUrls: ['./translation-array-view.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TranslationArrayViewComponent {
  value = input.required<string>();

  extract(): string[] {
    return JSON.parse(this.value() || '[]');
  }
}
