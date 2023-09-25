import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'll-translation-array-view',
  templateUrl: './translation-array-view.component.html',
  styleUrls: ['./translation-array-view.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TranslationArrayViewComponent {
  @Input() value = '';

  extract(): string[] {
    return JSON.parse(this.value || '[]');
  }
}
