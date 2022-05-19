import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
} from '@angular/core';

@Component({
  selector: 'll-translation-array-view',
  templateUrl: './translation-array-view.component.html',
  styleUrls: ['./translation-array-view.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TranslationArrayViewComponent implements OnInit {
  @Input() value: string = '';

  constructor() {}

  ngOnInit(): void {}

  extract(): string[] {
    return JSON.parse(this.value || '[]');
  }
}
