import {ChangeDetectionStrategy, Component, Input} from '@angular/core';

@Component({
  selector: 'll-translation-string-view',
  templateUrl: './translation-string-view.component.html',
  styleUrls: ['./translation-string-view.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TranslationStringViewComponent {
  @Input() value: string = '';

  constructor() {
  }
}
