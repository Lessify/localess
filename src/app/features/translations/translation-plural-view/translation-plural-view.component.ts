import {ChangeDetectionStrategy, Component, Input, OnInit} from '@angular/core';

interface Plural {
  0: string,
  1: string,
  2: string,
  3: string,
  4: string,
  5: string
}

@Component({
  selector: 'll-translation-plural-view',
  templateUrl: './translation-plural-view.component.html',
  styleUrls: ['./translation-plural-view.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TranslationPluralViewComponent implements OnInit {
  @Input() value: string = '';

  constructor() {
  }

  ngOnInit(): void {
  }

  extract(): Plural {
    return JSON.parse(this.value || '{}');
  }

  toPlural(key: string): string {
    switch (key) {
      case '0':
        return 'Zero';
      case '1':
        return 'One';
      case '2':
        return 'Two';
      case '3':
        return 'Few';
      case '4':
        return 'Many';
      case '5':
        return 'Other';
      default:
        return '';
    }
  }
}
